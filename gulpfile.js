const { src, dest, parallel, series, watch } = require('gulp');
const browserSync = require('browser-sync').create();
const bssi = require('browsersync-ssi');
const ssi = require('ssi');
const webpack = require('webpack-stream');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const sassglob = require('gulp-sass-glob');
const cleancss = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const stylglob = require("gulp-noop");
const imagemin = require('gulp-imagemin');
const newer = require('gulp-newer');
const del = require('del');

function browsersync() {
  browserSync.init({
    server: { 
      baseDir: 'app/',
      middleware: bssi({baseDir: 'app/', ext: '.html'})
   },
    ghostMode: {clicks: false},
    notify: false,
    online: false,
    // tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
  })
}

function scripts() {
  return src(['app/js/*.js', '!app/js/*.min.js'])
    .pipe(webpack({
      mode: 'production',
      performance: { hints: false },
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader',
            query: {
              presets: ['@babel/env'],
              plugins: ['babel-plugin-root-import']
            }
          }
        ]
      }
    })).on('error', function handleError() {
      this.emit('end')
    })
    .pipe(rename('scripts.min.js'))
    .pipe(dest('app/js'))
    .pipe(browserSync.stream())
}

function styles() {
  return src([`app/styles/*.*`, `!app/styles/_*.*`])
    .pipe(eval(`sassglob`)())
    .pipe(eval('sass')())
    .pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
    .pipe(cleancss({ level: { 1: { specialComments: 0 } },/* format: 'beautify' */ }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest('app/css'))
    .pipe(browserSync.stream())
}

function images() {
  return src(['app/images/src/**/*'])
    .pipe(newer('app/images/dist'))
    .pipe(imagemin())
    .pipe(dest('app/images/dist'))
    .pipe(browserSync.stream())
}

function buildcopy() {
  return src([
    '{app/js,app/css}/*.min.*',
    'app/images/**/*.*',
    '!app/images/src/**/*',
    'app/fonts/**/*'
  ], { base: 'app/' })
  .pipe(dest('dist'))
}

async function buildhtml() {
  let includes = new ssi('app/', 'dist/', '/**/*.html')
  includes.compile()
  del('dist/parts', { force: true })
}

function cleandist() {
  return del('dist/**/*', { force: true })
}

function startwatch() {
  watch(`app/styles/**/*`, { usePolling: true }, styles)
  watch(['app/js/**/*.js', '!app/js/**/*.min.js'], { usePolling: true }, scripts)
  watch('app/images/src/**/*.{jpg,jpeg,png,webp,svg,gif}', { usePolling: true }, images)
  watch(`app/**/*.{html,htm,txt,json,md,woff2}`, { usePolling: true }).on('change', browserSync.reload)
}



exports.scripts = scripts;
exports.styles  = styles;
exports.images  = images;
exports.assets  = series(scripts, styles, images)
exports.build   = series(cleandist, scripts, styles, images, buildcopy, buildhtml)
exports.default = series(scripts, styles, images, parallel(browsersync, startwatch))