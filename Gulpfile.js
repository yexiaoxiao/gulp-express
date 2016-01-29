'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    browserify = require('browserify'),
    concat = require('gulp-concat'),
    rimraf = require('gulp-rimraf'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    rename = require('gulp-rename'),
    minifycss = require('gulp-minify-css'),
    spriter = require('gulp-css-spriter');

// Modules for webserver and livereload
var express = require('express'),
    refresh = require('gulp-livereload'),
    livereload = require('connect-livereload'),
    livereloadport = 35729,
    serverport = 5000;

// Set up an express server (not starting it yet)
var server = express();
// Add live reload
server.use(livereload({port: livereloadport}));
// Use our 'dist' folder as rootfolder
server.use(express.static('./dist'));
// Because I like HTML5 pushstate .. this redirects everything back to our index.html
server.all('/*', function(req, res) {
  res.sendfile('index.html', { root: 'dist' });
});

// Dev task
gulp.task('dev', ['clean', 'views', 'styles', 'sprite' , 'lint', 'browserify'], function() { });

// Clean task
gulp.task('clean', function() {
	gulp.src('dist/views', { read: false }) // much faster
  .pipe(rimraf({force: true}));
});

// JSHint task
gulp.task('lint', function() {
  gulp.src('app/scripts/*.js')
  .pipe(jshint())
  .pipe(jshint.reporter('default'));
});

// Styles task
gulp.task('styles', function() {
  gulp.src('app/styles/*.scss')
  // The onerror handler prevents Gulp from crashing when you make a mistake in your SASS
  .pipe(sass({onError: function(e) { console.log(e); } }))
  // Optionally add autoprefixer
  .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8'))
  // These last two should look familiar now :)
  .pipe(gulp.dest('app/styles/'));
});

gulp.task('sprite',function() {
    var timestamp = +new Date();
    //需要自动合并雪碧图的样式文件
    gulp.src('app/styles/*.css')
        .pipe(spriter({
            // 生成的spriter的位置
            'spriteSheet': 'dist/images/sprite'+timestamp+'.png',
            // 生成样式文件图片引用地址的路径
            // 如下将生产：backgound:url(../images/sprite20324232.png)
            'pathToSpriteSheetFromCSS': '../images/sprite'+timestamp+'.png'
        }))
        .pipe(gulp.dest('dist/css'))
        .pipe(rename({suffix: '.min'}))
        .pipe(minifycss())
        //产出路径
        .pipe(gulp.dest('dist/css'));
});

// Browserify task
gulp.task('browserify', function() {
  return browserify('app/scripts/main.js')
      .bundle()
      .pipe(source('bundle.js')) // gives streaming vinyl file object
      .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
      .pipe(uglify()) // now gulp-uglify works 
      .pipe(gulp.dest('dist/js'));
});

// Views task
gulp.task('views', function() {
  // Get our index.html
  gulp.src('app/index.html')
  // And put it in the dist folder
  .pipe(gulp.dest('dist/'));

  // Any other view files from app/views
  gulp.src('app/views/**/*')
  // Will be put in the dist/views folder
  .pipe(gulp.dest('dist/views/'));
});

gulp.task('watch', ['lint'], function() {
  // Start webserver
  server.listen(serverport);
  // Start live reload
  refresh.listen(livereloadport);

  // Watch our scripts, and when they change run lint and browserify
  gulp.watch(['app/scripts/*.js', 'app/scripts/**/*.js'],[
    'lint',
    'browserify'
  ]);
  // Watch our sass files
  gulp.watch(['app/styles/**/*.scss'], [
    'styles'
  ]);
  gulp.watch(['app/styles/**/*.css'], [
    'sprite'
  ]);
  gulp.watch(['app/**/*.html'], [
    'views'
  ]);

  gulp.watch('./dist/**').on('change', refresh.changed);

});

gulp.task('default', ['dev', 'watch']);
