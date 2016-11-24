'use strict';

const gulp = require('gulp');
const del = require('del');
const autoprefixer = require('gulp-autoprefixer');
const remember = require('gulp-remember');
const path = require('path');
const browserSync = require('browser-sync').create();
const multipipe = require('multipipe');
const notify = require('gulp-notify');
const cssnano = require('gulp-cssnano');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const inject = require('gulp-inject');
const rename = require('gulp-rename');

var myPath = {
	dist: {
		index: 'dist/',
		html: 'dist/html/',
		js: 'dist/js/',
		css: 'dist/css/',
		img: 'dist/img/',
		fonts: 'dist/fonts/',
		others: 'dist/others/',
		readme: 'dist/'
	},
	src: {
		index: 'src/index.html',
		html: 'src/html/*.html',
		js: 'src/js/main.js',
		css: 'src/css/main.scss',
		img: 'src/img/**/*.*',
		fonts: 'src/fonts/**/*.*',
		others: 'src/others/**/*.*',
		readme: 'src/README.md',
		jade: 'src/js/main.jade',
		alljs: 'src/js/**/*.js',
		indexFolder: 'src/',
		jsFolder: 'src/js/'
	},
	watch: {
		index: 'src/*.html',
		html: 'src/html/**/*.html',
		js: 'src/js/**/*.js',
		css: 'src/css/**/*.scss',
		img: 'src/img/**/*.*',
		fonts: 'src/fonts/**/*.*',
		others: 'src/others/**/*.*',
		readme: 'src/README.md'
	},
	clean: 'dist'
};

gulp.task('injectHTML', function(done){
	gulp.src(myPath.src.index)
		.pipe(inject(gulp.src([myPath.src.html]), {
			starttag: '<!-- inject:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}))
		.pipe(gulp.dest(myPath.src.indexFolder));
	done();
});

gulp.task('injectJS', function(done){
	gulp.src(myPath.src.jade)
		.pipe(inject(gulp.src([myPath.src.alljs]), {
			starttag: '//- inject:jade',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}))
		.pipe(rename('main.js'))
		.pipe(gulp.dest(myPath.src.jsFolder));
	done();
});

gulp.task('index', function() {
	return multipipe(
		gulp.src(myPath.src.index),
		remember('index'),
		gulp.dest(myPath.dist.index)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('css', function() {
	return multipipe(
		gulp.src(myPath.src.css),
		remember('css'),
		sourcemaps.init(),
		sass(),
		autoprefixer(),
		cssnano(),
		sourcemaps.write(),
		gulp.dest(myPath.dist.css)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('cssRelease', function() {
	return multipipe(
		gulp.src(myPath.src.css),
		remember('css'),
		sass(),
		autoprefixer(),
		cssnano(),
		gulp.dest(myPath.dist.css)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});


gulp.task('js', function() {
	return multipipe(
		gulp.src(myPath.src.js),
		babel(),
		remember('js'),
		sourcemaps.init(),
		uglify(),
		sourcemaps.write(),
		gulp.dest(myPath.dist.js)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('jsRelease', function() {
	return multipipe(
		gulp.src(myPath.src.js),
		babel(),
		remember('js'),
		uglify(),
		gulp.dest(myPath.dist.js)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('img', function() {
	return multipipe(
		gulp.src(myPath.src.img),
		remember('img'),
		imagemin(),
		gulp.dest(myPath.dist.img)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('fonts', function() {
	return multipipe(
		gulp.src(myPath.src.fonts),
		remember('fonts'),
		gulp.dest(myPath.dist.fonts)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('others', function() {
	return multipipe(
		gulp.src(myPath.src.others),
		remember('others'),
		gulp.dest(myPath.dist.others)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('readme', function() {
	return multipipe(
		gulp.src(myPath.src.readme),
		remember('readme'),
		gulp.dest(myPath.dist.readme)
	).on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('clean', function() {
	return del(myPath.clean);
});

gulp.task('cleanJS', function() {
	return del(myPath.src.js);
});

gulp.task('server', function() {
	browserSync.init(
		{server: 'dist'});
	browserSync.watch('dist/**/*.*').on('change', browserSync.reload);
});

gulp.task('watch', function() {
	gulp.watch(myPath.src.js, gulp.series('js')).on('unlink', function(filepath) {
		remember.forget('js', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.css, gulp.series('css')).on('unlink', function(filepath) {
		remember.forget('css', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.img, gulp.series('img')).on('unlink', function(filepath) {
		remember.forget('img', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.fonts, gulp.series('fonts')).on('unlink', function(filepath) {
		remember.forget('fonts', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.others, gulp.series('others')).on('unlink', function(filepath) {
		remember.forget('others', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.index, gulp.series('index')).on('unlink', function(filepath) {
		remember.forget('index', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.html, gulp.series('html')).on('unlink', function(filepath) {
		remember.forget('html', path.resolve(filepath)).on('change', browserSync.reload);
	});
	gulp.watch(myPath.src.readme, gulp.series('readme')).on('unlink', function(filepath) {
		remember.forget('readme', path.resolve(filepath)).on('change', browserSync.reload);
	});
});

gulp.task('build', gulp.series('clean', 'cleanJS', 'injectHTML', 'injectJS', 'css', 'js', 'index', 'img', 'others', 'fonts', 'readme'));

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'server')));

gulp.task('buildRelease', gulp.series('clean', 'cleanJS', 'injectHTML', 'injectJS', 'cssRelease', 'jsRelease', 'index', 'img', 'others', 'fonts', 'readme'));

gulp.task('release', gulp.series('buildRelease', gulp.parallel('watch','server')));
