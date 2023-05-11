const gulp = require('gulp');
const ts = require('gulp-typescript');

const ASSETS = ['src/*.jpg', 'src/**/*.jpg', 'src/*.crt', 'src/**/*.crt', 'src/*.key', 'src/**/*.key', 'src/**/*.html'];

const tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', () => {
	const tsResult = tsProject.src().pipe(tsProject());
	return tsResult.js.pipe(gulp.dest('dist'));
});

gulp.task('watch', gulp.series('scripts', () => {
	gulp.watch('src/**/*.ts', gulp.series('scripts'));
}));

gulp.task('assets', function() {
	return gulp.src(ASSETS).pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.parallel('watch', 'assets'));