'use strict';

const gulp = require('gulp');
const del = require('del');
const autoprefixer = require('gulp-autoprefixer');
const remember = require('gulp-remember');
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
		indexFolder: 'dist/',
		indexHTML: 'dist/index.html',
		mainJS: 'dist/js/',
		otherJS: 'dist/js/other/',
		mainCSS: 'dist/css/',
		allImg: 'dist/img/',
		allFonts: 'dist/fonts/',
		allOthers: 'dist/others/',
		readme: 'dist/',
		bower: 'dist/bower_components/'
	},
	src: {
		indexHTML: 'src/index.html',
		allHTML: 'src/html/*.html',
		mainJS: 'src/js/main.js',
		mainSCSS: 'src/css/main.scss',
		mainCSS: 'src/css/main.css',
		partsSCSS: 'src/css/parts/*.scss',
		pluginsSCSS: 'src/css/plugins/*.scss',
		settingsSCSS: 'src/css/settings/*.scss',
		partsJS: 'src/js/parts/*.js',
		pluginsJS: 'src/js/plugins/*.js',
		swJS: 'src/*.js',
		allImg: 'src/img/**/*.*',
		allFonts: 'src/fonts/**/*.*',
		allOthers: 'src/others/**/*.*',
		readme: 'src/README.md',
		mainJade: 'src/js/main.jade',
		indexFolder: 'src/',
		jsFolder: 'src/js/',
		cssFolder: 'src/css/',
		bower: 'bower_components/**/*.*'
	},
	clean: 'dist'
};

gulp.task('injectHTML', function(){
	return multipipe(
		gulp.src(myPath.src.indexHTML),
		inject(gulp.src('src/html/_head.html'), {
			starttag: '<!-- inject:_head:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src('src/html/header.html'), {
			starttag: '<!-- inject:header:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src('src/html/navigation.html'), {
			starttag: '<!-- inject:navigation:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src('src/html/content.html'), {
			starttag: '<!-- inject:content:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src('src/html/footer.html'), {
			starttag: '<!-- inject:footer:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src('src/html/_scripts.html'), {
			starttag: '<!-- inject:_scripts:html -->',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		gulp.dest(myPath.src.indexFolder))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));			
});

gulp.task('injectJS', function(){
	return multipipe(
		gulp.src(myPath.src.mainJade),
		inject(gulp.src([myPath.src.partsJS]), {
			starttag: '//- inject:parts',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		inject(gulp.src([myPath.src.pluginsJS]), {
			starttag: '//- inject:plugins',
			transform: function (filePath, file) {
				return file.contents.toString();
			}
		}),
		rename('main.js'),
		gulp.dest(myPath.src.jsFolder))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('index', function() {
	return multipipe(
		gulp.src(myPath.src.indexHTML),
		gulp.dest(myPath.dist.indexFolder))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('css', function() {
	return multipipe(
		gulp.src(myPath.src.mainSCSS),
		sourcemaps.init(),
		sass(),
		autoprefixer(),
		cssnano(),
		sourcemaps.write(),
		gulp.dest(myPath.dist.mainCSS))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('cssRelease', function() {
	return multipipe(
		gulp.src(myPath.src.mainSCSS),
		sass(),
		autoprefixer(),
		cssnano(),
		gulp.dest(myPath.dist.mainCSS))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});


gulp.task('js', function() {
	return multipipe(
		gulp.src(myPath.src.mainJS),
		babel(),
		sourcemaps.init(),
//		uglify(),
		sourcemaps.write(),
		gulp.dest(myPath.dist.mainJS))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('otherJS', function() {
	return multipipe(
		gulp.src(myPath.src.swJS),
		babel(),
		sourcemaps.init(),
//		uglify(),
		sourcemaps.write(),
		gulp.dest(myPath.dist.indexFolder))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('jsRelease', function() {
	return multipipe(
		gulp.src(myPath.src.mainJS),
		babel(),
		uglify(),
		gulp.dest(myPath.dist.mainJS))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('otherJSRelease', function() {
	return multipipe(
		gulp.src(myPath.src.swJS),
		babel(),
		uglify(),
		gulp.dest(myPath.dist.indexFolder))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('img', function() {
	return multipipe(
		gulp.src(myPath.src.allImg),
		remember('img'),
		imagemin(),
		gulp.dest(myPath.dist.allImg))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('fonts', function() {
	return multipipe(
		gulp.src(myPath.src.allFonts),
		remember('fonts'),
		gulp.dest(myPath.dist.allFonts))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('others', function() {
	return multipipe(
		gulp.src(myPath.src.allOthers),
		remember('others'),
		gulp.dest(myPath.dist.allOthers))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('readme', function() {
	return multipipe(
		gulp.src(myPath.src.readme),
		remember('readme'),
		gulp.dest(myPath.dist.readme))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('bower', function() {
	return multipipe(
		gulp.src(myPath.src.bower),
		remember('bower'),
		gulp.dest(myPath.dist.bower))
	.on('error', notify.onError(function(err) {
		return {
			message: err.message
		};
	}));
});

gulp.task('clean', function() {
	return del(myPath.clean);
});

gulp.task('cleanMainJS', function() {
	return del(myPath.src.mainJS);
});

gulp.task('cleanMainSCSS', function() {
	del(myPath.src.mainSCSS);
	return multipipe(
		gulp.src(myPath.src.mainCSS),
		rename('main.scss'),
		gulp.dest(myPath.src.cssFolder)
	);
});	

gulp.task('server', function() {
	browserSync.init({
		server: 'dist'
	});
	browserSync.watch('dist/**/*.*')
	.on('change', browserSync.reload);
});

gulp.task('watch', function() {
	gulp.watch(myPath.src.partsJS, gulp.series('cleanMainJS', 'injectJS', 'js'));

	gulp.watch(myPath.src.pluginsJS, gulp.series('cleanMainJS', 'injectJS', 'js'));

	gulp.watch(myPath.src.swJS, gulp.series('otherJS'));

	gulp.watch(myPath.src.partsSCSS, gulp.series('cleanMainSCSS', 'css'));

	gulp.watch(myPath.src.pluginsSCSS, gulp.series('cleanMainSCSS', 'css'));

	gulp.watch(myPath.src.settingsSCSS, gulp.series('cleanMainSCSS', 'css'));

	gulp.watch(myPath.src.allImg, gulp.series('img'));

	gulp.watch(myPath.src.allFonts, gulp.series('fonts'));

	gulp.watch(myPath.src.allOthers, gulp.series('others'));

	gulp.watch(myPath.src.allHTML, gulp.series('injectHTML', 'index'));

	gulp.watch(myPath.src.readme, gulp.series('readme'));
});

gulp.task('build', gulp.series('clean', 'bower', 'cleanMainJS', 'cleanMainSCSS', 'injectJS', 'injectHTML', 'css', 'js', 'otherJS', 'index', 'img', 'others', 'fonts', 'readme'));

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'server')));

gulp.task('buildRelease', gulp.series('clean', 'bower', 'cssRelease', 'jsRelease', 'otherJSRelease', 'index', 'img', 'others', 'fonts', 'readme'));

gulp.task('release', gulp.series('buildRelease', gulp.parallel('watch','server')));
