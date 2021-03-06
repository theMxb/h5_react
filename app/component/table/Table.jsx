/**
  @author mxb
  @desc 轻量化表格
  @prop
    columns: [
      {
        field<string>: '列对应data要显示的属性名称', （必须提供）
        title<string>: '列显示的字段名称', （必须提供）
        key<string>: '相应react-dom的key', （如果不提供，则默认以field为key）
        width<number>: 列宽, （一般有限制的提供对应的宽度即可，其他的默认自适应auto）
        type<string>: 类型, 与排序有关,（默认string）, indexColumn, checkboxColumn
        sortOrder<string>: 排序方向, （默认null）, asc<正序>, desc<倒序>
        allowResize<bool>: 允许支持拉伸, （默认true）, false
        className<string>: 其他的class标识,作用于th
        render<function>: 返回对应渲染th内容 => function(indexData) {}
      }
    ]

    data<array>: 数据源

    //其他配置项
    config: {
      width<number>: 默认<auto>
      height<number>: 默认<auto>
      allowPager<bool>: 允许分页,（默认false）， true
      pagerSpac<number>: 分页间隔,（默认10）
      multiSelect<bool>: 是否支持选, （默认false）， true
      allowAsyn<bool>: 允许异步加载数据, （默认false）， true 一般需要设置响应的url
      url<string>: 请求地址
      dataResolve<function>: 数据解析 => function(asynData) { return asynData; //默认return 请求回来的数据，可以自行处理数据格式或其他逻辑 }
      onCellRender<function>: 用于td渲染前的操作 => function(sender) { return sender.value }
      onRowClick<function>: 行点击 => function(e, sender) {}
      onCellClick<function>: 表格点击 => function(e, sender) {}
    }
*/

import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import BaseComponent from '../BaseComponent'
import xoSystem from '../../tool/_xoSystem'
import Checkbox from '../input/Checkbox'
import './table.scss'

const _theadMap = Symbol('_theadMap')
const _map = Symbol('_map')
const _columns = Symbol('_columns')
const _column = Symbol('_column')
//const _data = Symbol('_data')
const _config = Symbol('_config')
const _renderThead = Symbol('_renderThead')
const _renderTbody = Symbol('_renderTbody')
const _renderGetTableWidth = Symbol('_renderGetTableWidth')//渲染获取表格宽度

//拉伸节点ref
const _ref_colResizePointer = Symbol('_ref_colResizePointer')
const _ref_colResizePointerBefore = Symbol('_ref_colResizePointerBefore')
const _colResize = Symbol('_colResize')
const _curTh = Symbol('_allowResize')
const _thCheckboxOnClick = Symbol(`_thCheckboxOnClick`)

//表格内容滚动事件
const _tbodyScroll = Symbol('_tbodyScroll')
//表格行点击事件
const _tbodyTrOnClick = Symbol('_tbodyTrOnClick')
//表格点击事件
const _tbodyTdOnClick = Symbol('_tbodyTdOnClick')

//排序
const _sort = Symbol('_sort')


export default class Table extends BaseComponent {

  [_theadMap] = null;
  [_map] = null;
  [_columns] = null;
  [_column] = {
    field: '',
    title: '',
    key: '',
    width: 'auto',
    type: 'string',
    sortOrder: null,
    allowResize: true,
    className: null,
    render: null,
    _theadMark: true,//th标识
    _index: 0//索引
  };
  //data = null;
  [_config] = {
    width: 'auto',
    height: '100%',
    multiSelect: false
  };
  ref_theadContainer = null;
  ref_tbodyContainer = null;

  //拉伸节点ref
  [_ref_colResizePointer] = null;
  [_ref_colResizePointerBefore] = null;
  [_curTh] = null;//当前的表头


  render() {
    return (
      <div className='xo-table-container'>
        <div className='xo-table-container-thead' ref={(_theadContainer) => this.ref_theadContainer = _theadContainer}>
        </div>
        <div className='xo-table-container-col-resize-pointer' ref={(_colResizePointer) => this[_ref_colResizePointer] = _colResizePointer}></div>
        <div className='xo-table-container-col-resize-pointer-before' ref={(_colResizePointerBefore) => this[_ref_colResizePointerBefore] = _colResizePointerBefore}></div>
        <div className='xo-table-container-tbody' ref={(_tbodyContainer) => this.ref_tbodyContainer = _tbodyContainer} onScroll={(e) => this[_tbodyScroll](e)}></div>
      </div>
    )
  }

  componentDidMount() {
    //this.enableEvent = true;
    super.componentDidMount();
    super.addResizeEventListener();
    Object.assign(this[_config], this.props.config);
    //if(this[_config].width == 'auto') {
      this.$dom.width(this.$dom.parent().width());
      $(this.ref_theadContainer).width(9999);
    //}
    this[_columns] = this.props.columns;
    this.data = this.props.data;
    this.refesh();
  }

  refesh() {
    this[_renderThead]();
    this[_renderTbody]();
    this.windowResize();
  }

  windowResize() {
    this.$dom.width(100);
    let width = this.$dom.parent().width();
    this.$dom.width(width);
    if(this[_config].width == '100%') {
      $(this.ref_theadContainer).find('table').width(width);
      $(this.ref_tbodyContainer).find('table').width(width);
      $.each($(this.ref_theadContainer).find('table th'), ((index, th) => {
        $(this.ref_tbodyContainer).find(`table td[data-index='${index}']`).css({width: th.offsetWidth, maxWidth: th.offsetWidth});
      }));
    }
    if(this[_config].height == '100%') {
      let height = this.$dom.parent().outerHeight() - this.ref_theadContainer.offsetHeight;
      if(height < this.ref_tbodyContainer.clientHeight) {
        $(this.ref_tbodyContainer).height(height);
        $(this.ref_tbodyContainer).height(this.ref_tbodyContainer.clientHeight - 3);
      }
    }
  }

  setData(data) {
    this.data = data;
    this[_renderTbody]();
  }

  [_renderThead]() {
    if(!this[_theadMap]) this[_theadMap] = new Map();
    else this[_theadMap].clear();
    let thead = <table className='xo-table xo-table-line' style={{width: 'auto'}}>
                  <thead className='xo-table-thead'>
                    <tr>
                      {
                        this[_columns].map((column, index) => {
                          column = Object.assign({}, this[_column], column);
                          column._index = index;
                          if(column.width == 'auto' && typeof this[_config].width == 'string') this[_config].width = '100%';
                          let _th = <th style={{width: column.width, maxWidth: column.width}}
                                        className={column.className}
                                        key={`xo-table-thead-th-${column._index}`}
                                        data-index={index}>
                                      {
                                        ((__column) => {
                                          let $column = null;
                                          if(__column.type == 'checkboxColumn' && this[_config].multiSelect) {
                                            $column = <Checkbox onClick={(checkbox) => this[_thCheckboxOnClick](checkbox)}/>;
                                          } else {
                                            if(__column.render && typeof __column.render == 'function') $column = __column.render();
                                            else {
                                              $column = __column.title;
                                              if(__column.sortOrder) {
                                                let sortClassName = 'caret-up';
                                                if(__column.sortOrder == 'desc') sortClassName = 'caret-down';
                                                $column = <a onClick={(e) => this[_sort](e)}>{$column}<span className={`fa fa-${sortClassName}`}></span></a>;
                                              }
                                            }
                                          }
                                          return <div>{$column}</div>
                                        })(column)
                                      }

                                      {
                                        ((__column, __index, __columns) => {
                                          if(__index < __columns.length - 1 && __column.allowResize) {
                                            return <span onMouseDown={(e) => this[_colResize](e, true)}
                                                         className='xo-col-resize'>
                                                    </span>
                                          }
                                        })(column, index, this[_columns])
                                      }
                                    </th>;
                          this[_theadMap].set(_th, column);
                          return _th;
                        })
                      }
                    </tr>
                  </thead>
                </table>;
    ReactDOM.render(thead, this.ref_theadContainer);
    $(this.ref_theadContainer).find('table').outerWidth(this[_renderGetTableWidth]());
  }

  [_renderTbody]() {
    let tableWidth = this[_renderGetTableWidth]();
    if(!this[_map]) this[_map] = new Map();
    else this[_map].clear();
    if(!this.data || this.data.length == 0) {
      ReactDOM.render(<div></div>, this.ref_tbodyContainer);
      return;
    }
    if(tableWidth == 'auto') tableWidth = $(this.ref_theadContainer).find('table').outerWidth();
    let tbody = <table className='xo-table xo-table-line' style={{width: tableWidth}}>
                  <tbody>
                    {
                      this.data.map((_data, index) => {
                        let tds = [];
                        for(let column of this[_theadMap].values()) {
                          if(column._theadMark) {
                            let _td = <td
                                        data-index={column._index}
                                        style={{width: column.width, maxWidth: column.width}}
                                        key={`xo-table-tbody-td-${column._index} ${column.field}`}
                                        onClick={(e) => this[_tbodyTdOnClick](e)}>
                                        <div>
                                          {
                                            ((__this, __data, __column, __index) => {
                                              let cellRenderDOM = null;
                                              if(__this[_config].onCellRender && typeof __this[_config].onCellRender == 'function')
                                                cellRenderDOM = __this[_config].onCellRender({column: __column, data: __data});
                                              if(__column.type == 'checkboxColumn') cellRenderDOM = <Checkbox />;
                                              else if(__column.type == 'indexColumn') cellRenderDOM = __index + 1;
                                              if(!cellRenderDOM) cellRenderDOM = __data[__column.field];
                                              return cellRenderDOM;
                                            })(this, _data, column, index)
                                          }
                                        </div>
                                      </td>;
                            tds.push(_td);
                          }
                        }
                        let _tr = <tr onClick={(e) => this[_tbodyTrOnClick](e)} key={`xo-table-tbody-tr-${index}`}>{tds}</tr>;
                        this[_map].set(_tr, _data);
                        return _tr;
                      })
                    }
                  </tbody>
                </table>;
    ReactDOM.render(tbody, this.ref_tbodyContainer);

  }

  [_renderGetTableWidth]() {
    if(this[_config].width == '100%') return this.$dom.width();
    else return 'auto';
  }

  //拉伸列
  [_colResize](el) {
    let th = el.target.parentElement;
    $(this[_ref_colResizePointer]).css({left: th.offsetLeft + this.ref_theadContainer.offsetLeft + th.offsetWidth}).show();
    $(this[_ref_colResizePointerBefore]).css({left: th.offsetLeft + this.ref_theadContainer.offsetLeft}).show();
    let _pageX = el.pageX;
    this[_curTh] = new Map([[el._targetInst._hostParent._currentElement, this[_theadMap].get(el._targetInst._hostParent._currentElement)]]);
    document.body.onselectstart = () => { return false }
    this.$dom
      .on('mousemove', (e) => {
        let dist = e.pageX - _pageX;
        _pageX += dist;
        $(this[_ref_colResizePointer]).css({left: this[_ref_colResizePointer].offsetLeft + dist});
      })
      .on('mouseup', (e) => {
        this.$dom.mouseleave();
      })
      .on('mouseleave', (e) => {
        this.$dom.off('mouseleave').off('mouseup').off('mousemove');
        $(this.ref_theadContainer).find('table').width('auto');
        let width = this[_ref_colResizePointer].offsetLeft - this[_ref_colResizePointerBefore].offsetLeft;
        $(th).css({width: width, 'max-width': width});
        let tableWidth = this[_renderGetTableWidth]();
        $(this.ref_theadContainer).find('table').outerWidth(tableWidth);
        width = th.offsetWidth;
        for(let [key, value] of this[_curTh]) {
          value.width = width;
          this[_theadMap].set(key, value);
          $(this.ref_tbodyContainer).find(`td[data-index='${value._index}']`).css({width: width, 'max-width': width});
        }
        $(this.ref_tbodyContainer).find('table').outerWidth($(this.ref_theadContainer).find('table').outerWidth());
        if(this[_config].width == '100%') {
          let ths = $(th).siblings();
          $.each(ths, (index, _th) => {
            //if(_th.getAttribute('style').indexOf('width: auto') > -1) {
              $(this.ref_tbodyContainer).find(`table td[data-index='${$(_th).attr('data-index')}']`).css({width: _th.offsetWidth, maxWidth: _th.offsetWidth});
            //}
          });
        }
        $(this[_ref_colResizePointer]).hide();
        $(this[_ref_colResizePointerBefore]).hide();
        document.body.onselectstart = () => { return true }
      });

  }

  //表格内容滚动事件
  [_tbodyScroll](e) {
    $(this.ref_theadContainer).css({left: -e.target.scrollLeft});
  }

  //表格列checkbox
  [_thCheckboxOnClick](checkbox) {
    if(checkbox.getValue()) {
      $(this.ref_tbodyContainer).find('tr').addClass('xo-selected');
      $(this.ref_tbodyContainer).find('tr td div input[type="checkbox"]').prop('checked', true);
    } else {
      $(this.ref_tbodyContainer).find('tr').removeClass('xo-selected');
      $(this.ref_tbodyContainer).find('tr td div input[type="checkbox"]').prop('checked', false);
    }
  }

  //表格行点击事件
  [_tbodyTrOnClick](e) {
    let $target = $(e.currentTarget);
    if(e.target.getAttribute('type') != 'checkbox' || !this[_config].multiSelect) $target.siblings().removeClass('xo-selected');
    if(e.target.getAttribute('type') == 'checkbox') {
      let td = e.target.parentNode.parentNode.parentNode.parentNode;
      let index = parseInt($(td).attr('data-index'));
      if($(e.target).is(':checked')) {
        $target.addClass('xo-selected');
        if(this[_config].multiSelect && $(this.ref_tbodyContainer).find(`tr.xo-selected`).length == $(this.ref_tbodyContainer).find(`tr`).length) $(this.ref_theadContainer).find(`th:nth-child(${index+1}) input[type='checkbox']`).prop('checked', true);
      } else {
        $target.removeClass('xo-selected');
        if(this[_config].multiSelect) $(this.ref_theadContainer).find(`th:nth-child(${index+1}) input[type='checkbox']`).prop('checked', false);
      }
    } else $target.addClass('xo-selected');

    let tr = super.findReactDOMNode(e);
    let sender = { row: this[_map].get(tr) }

    if(this[_config].onRowClick && typeof this[_config].onRowClick == 'function') this[_config].onRowClick(e, sender);
  }

  //表格点击事件
  [_tbodyTdOnClick](e) {
    let td = super.findReactDOMNode(e);
    let tr = super.findReactDOMNode(e, 'tr');
    let field = td.key.split(' ')[1];
    let row = this[_map].get(tr);
    let sender = {
      field: field,
      value: row[field],
      row: row
    }
    if(this[_config].onCellClick && typeof this[_config].onCellClick == 'function') this[_config].onCellClick(e, sender);
  }

  //排序
  [_sort](e) {
    let $span = $(e.target);
    let key = e._targetInst._hostParent._hostParent._hostParent._currentElement;
    if(!$span.is('span.fa')) {
      key = e._targetInst._hostParent._hostParent._currentElement;
      $span = $span.find('span.fa');
    }
    let value = this[_theadMap].get(key);
    xoSystem.sort(this.data, value.sortOrder, [value.field]);
    let sortClassName = 'caret-up';
    if(value.sortOrder == 'asc') value.sortOrder = 'desc';
    else { value.sortOrder = 'asc'; sortClassName = 'caret-down'; }
    this[_theadMap].set(key, value);
    $span.removeClass().addClass(`fa fa-${sortClassName}`);
    this[_renderTbody]();
  }

}

Table.propTypes = {
  columns: React.PropTypes.array,
  data: React.PropTypes.array
}

Table.defaultProps = {
  columns: [],
  data: []
}
