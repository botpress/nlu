export default () => {
  // @ts-ignore
  if (!process.core_env) {
    // @ts-ignore
    process.core_env = process.env as BotpressEnvironmentVariables
  }

  // @ts-ignore
  process.APP_DATA_PATH = ''
}
