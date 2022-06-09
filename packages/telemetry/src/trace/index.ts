import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger'
import { defaultServiceName, Resource } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import yn from 'yn'

export const isEnabled = () => yn(process.env.TRACING_ENABLED, { default: false })

const isDebug = () => yn(process.env.TRACING_DEBUG, { default: false })

/**
 * Warning: This function must be sync to instrument other packages
 * since it creates hooks in other packages it must be the first to execute
 */
export const init = () => {
  const enabled = isEnabled()

  if (!enabled) {
    return
  }

  if (isDebug()) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
  }

  const propagator = new JaegerPropagator()
  const exporter = new JaegerExporter()
  const processor = new BatchSpanProcessor(exporter)

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? defaultServiceName()
    })
  })

  provider.addSpanProcessor(processor)
  provider.register({ propagator })

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [getNodeAutoInstrumentations()]
  })
}
