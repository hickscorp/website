'use strict';

// Include Gulp & tools we'll use
var gulp                = require('gulp');
var $                   = require('gulp-load-plugins')();
var del                 = require('del');
var runSequence         = require('run-sequence');
var browserSync         = require('browser-sync');
var reload              = browserSync.reload;
var merge               = require('merge-stream');
var path                = require('path');
var historyApiFallback  = require('connect-history-api-fallback');
var ensureFiles         = require('./tasks/ensure-files.js');

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];
var DIST = 'dist';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

var styleTask = function(stylesPath, srcs) {
  return gulp
    .src(srcs.map(function(src) { return path.join('app', stylesPath, src); }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/' + stylesPath))
    .pipe($.minifyCss())
    .pipe(gulp.dest(dist(stylesPath)))
    .pipe($.size({title: stylesPath}));
};
var imageOptimizeTask = function(src, dest) {
  return gulp
    .src(src)
    .pipe($.imagemin({progressive: true, interlaced: true}))
    .pipe(gulp.dest(dest))
    .pipe($.size({title: 'images'}));
};
var optimizeHtmlTask = function(src, dest) {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app']});
  return gulp
    .src(src)
    .pipe(assets)
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    .pipe($.if('*.css', $.minifyCss()))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.if('*.html', $.minifyHtml({quotes: true, empty: true, spare: true})))
    .pipe(gulp.dest(dest))
    .pipe($.size({title: 'html'}));
};

gulp.task('styles', function() {
  return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function() {
  return styleTask('elements', ['**/*.css']);
});

gulp.task('ensureFiles', function(cb) {
  var requiredFiles = ['.jscsrc', '.jshintrc', '.bowerrc'];
  ensureFiles(
    requiredFiles.map(function(p) {
      return path.join(__dirname, p);
    }), cb
  );
});

gulp.task('lint', ['ensureFiles'], function() {
  return gulp
    .src([
      'app/scripts/**/*.js',
      'app/elements/**/*.js',
      'app/elements/**/*.html',
      'gulpfile.js'
    ])
    .pipe(reload({
      stream: true,
      once: true
    }))
    .pipe($.if('*.html', $.htmlExtract({strip: true})))
    .pipe($.jshint())
    .pipe($.jscs())
    .pipe($.jscsStylish.combineWithHintResults())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

gulp.task('images', function() {
  return imageOptimizeTask('app/images/**/*', dist('images'));
});

gulp.task('copy', function() {
  var app = gulp
      .src(['app/*', '!app/elements', '!app/bower_components'], {dot: true})
      .pipe(gulp.dest(dist()));
  var bower = gulp
      .src(['app/bower_components/{webcomponentsjs,promise-polyfill}/**/*'])
      .pipe(gulp.dest(dist('bower_components')));
  return merge(app, bower).pipe($.size({title: 'copy'}));
});

gulp.task('fonts', function() {
  return gulp
    .src(['app/fonts/**'])
    .pipe(gulp.dest(dist('fonts')))
    .pipe($.size({title: 'fonts'}));
});

gulp.task('html', function() {
  return optimizeHtmlTask(['app/**/*.html', '!app/{elements,bower_components}/**/*.html'], dist());
});

gulp.task('vulcanize', function() {
  return gulp
    .src('app/elements/elements.html')
    .pipe($.vulcanize({stripComments: true, inlineCss: true, inlineScripts: true}))
    .pipe(gulp.dest(dist('elements')))
    .pipe($.size({title: 'vulcanize'}));
});

gulp.task('clean', function() {
  return del(['.tmp', dist()]);
});

gulp.task('serve', ['lint', 'styles', 'elements', 'images'], function() {
  browserSync({
    port:           5000,
    notify:         false,
    logPrefix:      'SudoersLDA',
    snippetOptions: {
      rule:           {
        match:          '<span id="browser-sync-binding"></span>',
        fn:             function(snippet) { return snippet; }
      }
    },
    server:         {
      baseDir:        ['.tmp', 'app'],
      middleware:     [historyApiFallback()]
    }
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
  gulp.watch(['app/elements/**/*.css'], ['elements', reload]);
  gulp.watch(['app/{scripts,elements}/**/{*.js,*.html}'], ['lint']);
  gulp.watch(['app/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function() {
  browserSync({
    port:           5001,
    notify:         false,
    logPrefix:      'SudoersLDA',
    snippetOptions: {
      rule: {
        match:        '<span id="browser-sync-binding"></span>',
        fn:           function(snippet) { return snippet; }
      }
    },
    server:           dist(),
    middleware:       [historyApiFallback()]
  });
});

// Build production files, the default task
gulp.task('default', ['clean'], function(cb) {
  runSequence(['copy', 'styles'], 'elements', ['lint', 'images', 'fonts', 'html'], 'vulcanize', cb);
});

try { require('require-dir')('tasks'); } catch (err) {}
