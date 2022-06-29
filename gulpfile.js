const gulp = require('gulp')
const package = require('./scripts/gulp.package')
const release = require('./scripts/gulp.release')

gulp.task('default', (cb) => {
  console.log(`
      Development Cheat Sheet
      ==================================
      yarn cmd package                      Packages Application in binaries
      yarn cmd bump                         Bump version and update change log
      yarn cmd changelog                    Print change log
    `)
  cb()
})

gulp.task('package', package.package)
gulp.task('bump', release.bumpVersion)
gulp.task('changelog', release.printChangeLog)
