const gulp = require('gulp')
const package = require('./scripts/gulp.package')
const config = require('./scripts/gulp.config')
const release = require('./scripts/gulp.release')

gulp.task('default', (cb) => {
  console.log(`
      Development Cheat Sheet
      ==================================
      yarn cmd package                      Packages Application in binaries
      yarn cmd config                       Upsert new NLU server config file
      yarn cmd bump                         Bump version and update changelog
    `)
  cb()
})

gulp.task('package', package.package)
gulp.task('config', config.upsertConfigFile)
gulp.task('bump', release.bumpVersion)
