var path = require("path");
var fs = require("fs");
var webpack = require('webpack');
//var ExtractTextPlugin = require("extract-text-webpack-plugin");
var HtmlWebpackPlugin = require('html-webpack-plugin');
var autoprefixer = require('autoprefixer');

module.exports = {
  devtool: 'eval-source-map',
  devServer: {
    historyApiFallback: true,
    hot: true,
    inline: true,
    progress: true,
    //contentBase: '/',
    port: 8082
  },
  entry : {
    bundle : path.resolve(__dirname, "app/main.js"),
    vendors : ["react", "react-dom", "jquery", "react-redux", "redux"]
  },
  output : {
    path : path.resolve(__dirname, "build"),
    filename : "assets/[name].[hash].js",
    chunkFilename : "chunk/[name].[chunkhash:5].chunk.js"//异步加载
    //publicPath : '',
  },
  resolve : {
    extensions:["",".js",".json",".jsx",".es6","css","scss","png","jpg","jpeg"],
    // alias: {
    //   'react-router': path.join(__dirname, '..', 'modules')
    // }
  },
  // content : __dirname,
  // node : {
  //   __dirname : true
  // },
  module : {
    loaders : [
      {
        test : /\.js[x]?$/,
        exclude : /node_modules/,
        //include : path.resolve(__dirname, 'app'),
        loader : "babel",
        query : {
            presets : ['es2015', 'stage-0', 'react']
        },
        plugins : ["transform-runtime"]
      },
      {
        test : /\.css$/,
        loader : "style!css!postcss"
        //loader : ExtractTextPlugin.extract(["css", "postcss"])
      },
      {
        test : /\.scss$/,
        loader : "style!css!sass!postcss"
        //loader : ExtractTextPlugin.extract(["css", "sass", "postcss"])
      },
      {
        test : /\.(png|jpg|jpeg|gif)$/,
        loader : 'url',
        query : {limit : 10000, name:'images/[name].[ext]'}
      },
      {
        test : /\.(eot|woff|woff2|ttf|svg)((\?|\#)[\?\#\w\d_-]+)?$/,
        loader : "url",
        query : {limit: 10000, name: 'fonts/[name].[ext]'}
      },
      // {
      //   test : /app\.js[x]$/,
      //   loader : path.join(__dirname, "./routes-loader"),
      //   exclude : /node_modules/
      // },
    ]
  },
  postcss : [autoprefixer({browsers:["last 3 version", "Firefox >= 15", "IE >= 10", "Opera >= 12"]})],//{browsers:['last 2 versions']}
  plugins : [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.CommonsChunkPlugin('vendors', 'assets/vendors.js', Infinity),
    //new webpack.optimize.CommonsChunkPlugin('common.js'),
    //new ExtractTextPlugin("[name].css"),
    new HtmlWebpackPlugin({
      title : "XO-UI",
      template : path.resolve(__dirname, "app/__index.html"),
      filename : "index.html",
      chunks : ["vendors", "bundle"],
      inject : "body"
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ]
}


// This will make the redux-simpler-router module resolve to the
// latest src instead of using it from npm. Remove this if running
// outside of the source.
// var src = path.join(__dirname, '..', '..', 'src')
// var fs = require('fs')
// if (fs.existsSync(src)) {
//   // Use the latest src
//   module.exports.resolve = { alias: { 'react-router-redux': src } }
//   module.exports.module.loaders.push({
//     test: /\.js$/,
//     loaders: ['babel'],
//     include: src
//   });
// }
