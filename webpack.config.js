import { fileURLToPath } from "url";
import { dirname } from "path";
import WebpackBar from "webpackbar";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = __dirname + "/dist";
const publicPath = __dirname + "/public";
const htmlPath = publicPath + "/index.html";

const port = 4200;

export default {
  entry: "./src/main.tsx",
  output: {
    path: distPath,
    filename: "main.[contenthash].js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@src": __dirname + "/src",
      "@assets": __dirname + "/src/assets/",
    },
  },
  module: {
    rules: [
      {
        test: /\.(glsl|vs|fs)$/,
        loader: "ts-shader-loader",
      },
      {
        test: /\.(ico|svg|png|jpg|webp)$/, // 匹配不同后缀格式的图片文件
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192, // 图片文件小于8KB时转换为base64编码
              name: "images/[name].[ext]", // 输出路径和文件名格式
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader", // 将CSS注入到页面中的<style>标签
          "css-loader", // 将CSS转换为CommonJS模块
          "sass-loader", // 将SCSS编译为CSS
        ],
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new WebpackBar(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: htmlPath,
      hash: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: publicPath,
          to: ".",
          filter: (resourcePath) => {
            return resourcePath !== htmlPath;
          },
        },
      ],
    }),
  ],

  // 禁用控制台消息
  stats: false,
  infrastructureLogging: { level: "error" },

  devServer: {
    static: distPath,
    host: "0.0.0.0",
    port: port,
    client: {
      // 错误遮罩层提示
      overlay: {
        errors: true,
        runtimeErrors: true,
        warnings: false,
      },
    },
    onListening: function () {
      console.log(`--------[Dev Server]--------

Preview link:

    http://localhost:${port}/

Dist directory:

    ${distPath}
`);
    },
  },
};
