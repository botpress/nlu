import opentelemetry from '@opentelemetry/api'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

export const initTracing = async () => {
  const provider = new NodeTracerProvider()

  const exporter = new JaegerExporter()

  provider.addSpanProcessor(new BatchSpanProcessor(exporter))

  provider.register()

  registerInstrumentations({
    instrumentations: [
      new PgInstrumentation(),
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  })
}
