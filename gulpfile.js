const gulp = require('gulp')
const package = require('./scripts/gulp.package')

gulp.task('default', (cb) => {
  console.log(`
      Development Cheat Sheet
      ==================================
      yarn cmd package                      Packages Application in binaries
    `)
  cb()
})

gulp.task('package', package.package)
