.PHONY: help data-up data-down data-rebuild obs-up obs-down obs-rebuild all-up all-down all-rebuild clean

help:
	@echo "AlgoFlow Commands:"
	@echo "  make data-up       - Start data pipeline"
	@echo "  make data-down     - Stop data pipeline"
	@echo "  make data-rebuild  - Rebuild and restart data pipeline"
	@echo "  make obs-up        - Start observability stack"
	@echo "  make obs-down      - Stop observability stack"
	@echo "  make obs-rebuild   - Rebuild and restart observability"
	@echo "  make all-up        - Start all services"
	@echo "  make all-down      - Stop all services"
	@echo "  make all-rebuild   - Rebuild and restart all services"
	@echo "  make clean         - Stop all and remove volumes"

data-up:
	cd infrastructure && docker compose -f docker-compose.data-pipeline.yml up -d

data-down:
	cd infrastructure && docker compose -f docker-compose.data-pipeline.yml down

data-rebuild:
	cd infrastructure && docker compose -f docker-compose.data-pipeline.yml up -d --build

obs-up:
	cd infrastructure && docker compose -f docker-compose.observability.yml up -d

obs-down:
	cd infrastructure && docker compose -f docker-compose.observability.yml down

obs-rebuild:
	cd infrastructure && docker compose -f docker-compose.observability.yml up -d --build

all-up:
	cd infrastructure && docker compose up -d

all-down:
	cd infrastructure && docker compose down

all-rebuild:
	cd infrastructure && docker compose up -d --build

clean:
	cd infrastructure && docker compose down -v