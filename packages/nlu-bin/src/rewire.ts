import Module from 'module'

// Rewires imports to target the source code of other modules when transpiling
if (process.env.TS_NODE_DEV) {
  const originalRequire = Module.prototype.require

  const rewire: NodeRequire = function (this: NodeRequire, mod: string) {
    if (mod.startsWith('@botpress')) {
      return originalRequire.apply(this, [mod + '/src/index.ts'])
    }
    return originalRequire.apply(this, [mod])
  } as NodeRequire
  Module.prototype.require = rewire
}
