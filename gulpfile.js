var gulp = require('gulp');

var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var concat = require('gulp-concat');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('default', function() {
    // place code for your default task here
});

gulp.task('lint', function() {
    return gulp.src(['src/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('test',['lint'], function() {
    return gulp.src('test/*.js', {read: false})
        .pipe(mocha({reporter: 'dot'}));
});

gulp.task('build', function() {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('movingai2json.js'))
    .pipe(babel())
    // Save Intermediate Babelized File
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'));
});
