'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    browserify = require('browserify'),
    concat = require('gulp-concat'),
    rimraf = require('gulp-rimraf'), //删除目录 暂不用
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    rename = require('gulp-rename'),
    minifycss = require('gulp-minify-css'),
    spriter = require('gulp-css-spriter'),
    rev = require('gulp-rev'),
    gulpif = require('gulp-if'),
    changed = require('gulp-changed'),
    minifyHtml = require('gulp-minify-html'),
    clean = require('gulp-clean'),
    csslint = require('gulp-csslint'),
    imagemin = require('gulp-imagemin'),
    revCollector = require('gulp-rev-collector');

// Modules for webserver and livereload
var express = require('express'),
    refresh = require('gulp-livereload'),
    livereload = require('connect-livereload'),
    livereloadport = 35729,
    serverport = 5000;



    var cssSrc = 'cache/css/*.css',
        cssDest = 'dist/css',
        jsSrc = 'cache/js/*.js',
        jsDest = 'dist/js',
        imgSrc = 'cache/images/*.{png,jpg,gif,ico}',
        imgDest = 'dist/images',
        cssRevSrc = 'cache/css/*.css',
        condition = true;



    //Fonts & Images 根据MD5获取版本号
    gulp.task('revImg', function(){
      return  gulp.src(imgSrc)
            .pipe(rev())
            .pipe(gulp.dest(imgDest))
            .pipe(rev.manifest())
            .pipe(gulp.dest('cache/rev/images'));
    });

    //压缩JS/生成版本号
    gulp.task('miniJs', function(){
      return  gulp.src(jsSrc)
            .pipe(gulpif(
                condition, uglify()
            ))
            .pipe(rev())
            .pipe(gulp.dest(jsDest))
            .pipe(rev.manifest())
            .pipe(gulp.dest('cache/rev/js'));
    });

   // CSS里更新引入文件版本号
    gulp.task('revCollectorCss', function () {
     return   gulp.src(['cache/rev/**/*.json', 'cache/css/*.css'])
            .pipe(revCollector())
            .pipe(gulp.dest('dist/css'));
    });

    //压缩/合并CSS/生成版本号
    gulp.task('miniCss', function(){
      return  gulp.src(cssRevSrc)
            .pipe(rev())
            .pipe(gulpif(
                    condition, changed(cssDest)
            ))
            .pipe(autoprefixer({
                browsers: ['last 2 versions'],
                cascade: false,
                remove: false       
            }))
            .pipe(gulp.dest(cssDest))
            .pipe(rev.manifest())
            .pipe(gulp.dest('cache/rev/css'));
    });

    //压缩Html/更新引入文件版本
    gulp.task('miniHtml', function () {
      return  gulp.src(['cache/rev/**/*.json', 'cache/**/*.html'])
            .pipe(revCollector())
            .pipe(gulpif(
                condition, minifyHtml({
                    empty: true,
                    spare: true,
                    quotes: true
                })
            ))
            .pipe(gulp.dest('dist'));
    });

   





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

// Dev task  开发构建
gulp.task('dev', ['clean', 'minImages', 'styles' , 'lint', 'browserify'], function() { 
 gulp.start('views','sprite');
  });
// build  正式构建
gulp.task('build', ['cleandist'], function() { 
   gulp.start( 'revImg', 'revCollectorCss' ,'miniCss' , 'miniJs', 'miniHtml');
  });


// Clean task
gulp.task('clean', function() {
return	gulp.src(['cache/css','cache/images', 'cache/js', 'cache/views' ], {read: false})
    .pipe(clean());
});

// Clean dist
gulp.task('cleandist', function() {
 return gulp.src(['dist'], {read: false})
    .pipe(clean());
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
 //  var timestamp = +new Date();
    //需要自动合并雪碧图的样式文件
    gulp.src('app/styles/*.css')
        .pipe(spriter({
            // 生成的spriter的位置
            'spriteSheet': 'cache/images/sprite.png',
            // 生成样式文件图片引用地址的路径
            // 如下将生产：backgound:url(../images/sprite20324232.png)
            'pathToSpriteSheetFromCSS': '../images/sprite.png'
        }))
        .pipe(gulp.dest('cache/css'));
        // .pipe(rename({suffix: '.min'}))
        // .pipe(minifycss())
        // //产出路径
        // .pipe(gulp.dest('cache/css'));
});

// Browserify task
gulp.task('browserify', function() {
  browserify('app/scripts/main.js')
      .bundle()
      .pipe(source('bundle.js')) // gives streaming vinyl file object
      .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
      .pipe(uglify()) // now gulp-uglify works 
      .pipe(gulp.dest('cache/js'));
});

// Views task
gulp.task('views', function() {
  // Get our index.html
  gulp.src('app/index.html')
  // And put it in the cache folder
  .pipe(gulp.dest('cache/'));

  // Any other view files from app/views
  gulp.src('app/views/**/*')
  // Will be put in the cache/views folder
  .pipe(gulp.dest('cache/views/'));
});

//图片压缩
    gulp.task('minImages', function () {
     gulp.src('app/images/**/*.{png,jpg,gif,ico}')
      .pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
      .pipe(gulp.dest('cache/images'));
   
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
