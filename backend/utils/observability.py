"""
OpenTelemetry tracing setup for AlgoFlow services.
"""

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.status import Status, StatusCode
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry._logs import set_logger_provider
import os
import logging

# Global tracer and meter - import these in your code
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

# Setup logger
logger = logging.getLogger(__name__)

def setup_tracing(
    service_name: str,
    endpoint: str | None = None,
    environment: str | None = None
) -> None:
    """
    Initialize OpenTelemetry tracing and metrics for a service.

    Args:
        service_name: Name of the service (e.g., "yfinance-pipeline")
        endpoint: OTLP endpoint URL (defaults to env var or localhost:4318)
        environment: Deployment environment (auto-detects if None)

    Example:
        # Simple usage
        setup_tracing(service_name="yfinance-pipeline")

        # Custom endpoint
        setup_tracing(
            service_name="yfinance-pipeline",
            endpoint="http://otel-lgtm:4318",
            environment="production"
        )
    """
    # Auto-detect environment if not specified
    if environment is None:
        if os.getenv("AIRFLOW_HOME"):
            environment = "production"
        else:
            environment = "development"

    # Use environment variable or default endpoint (base URL without path)
    if endpoint is None:
        endpoint = os.getenv(
            "OTEL_EXPORTER_OTLP_ENDPOINT",
            "http://localhost:4318"
        )

    # Create resource with service identification
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": environment,
    })

    # Set up tracer provider
    trace_provider = TracerProvider(resource=resource)

    # Configure OTLP trace exporter
    trace_exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces")

    # Add batch span processor for efficient batching
    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))

    # Set as global tracer provider
    trace.set_tracer_provider(trace_provider)

    # Set up metrics provider
    metric_exporter = OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics")
    metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=60000)
    metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])

    # Set as global meter provider
    metrics.set_meter_provider(metric_provider)

    # Set up logging provider
    log_exporter = OTLPLogExporter(endpoint=f"{endpoint}/v1/logs")
    log_provider = LoggerProvider(resource=resource)
    log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    set_logger_provider(log_provider)

    # Add OTLP handler to root logger with trace correlation
    handler = LoggingHandler(level=logging.NOTSET, logger_provider=log_provider)

    # Configure handler to include trace context
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.DEBUG)  # Ensure all levels are captured

    # Suppress only OTel exporter's internal HTTP logging (not application HTTP requests)
    logging.getLogger("opentelemetry.exporter").setLevel(logging.WARNING)
    logging.getLogger("opentelemetry.sdk._logs.export").setLevel(logging.WARNING)

    # Suppress urllib3 logs ONLY for localhost:4318 (OTel endpoint)
    # This prevents recursive logging but keeps HTTP logs for yfinance/APIs
    class OTelEndpointFilter(logging.Filter):
        def filter(self, record):
            # Block only logs about localhost:4318 requests
            return "localhost:4318" not in record.getMessage()

    logging.getLogger("urllib3.connectionpool").addFilter(OTelEndpointFilter())

    # Suppress yfinance internal database operations (cookie cache)
    logging.getLogger("peewee").setLevel(logging.WARNING)

    logger.info(f"OTEL tracing, metrics, logs enabled: '{service_name}' [{environment}] → {endpoint}")


# Export Status and StatusCode for convenience
__all__ = ["tracer", "meter", "setup_tracing", "Status", "StatusCode"]
