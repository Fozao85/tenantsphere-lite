#!/bin/bash

# TenantSphere Deployment Script
set -e

echo "🚀 Starting TenantSphere deployment..."

# Configuration
PROJECT_NAME="tenantsphere"
DOCKER_REGISTRY="your-registry.com"
VERSION=${1:-latest}
ENVIRONMENT=${2:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log_info "Loading environment variables..."
    
    if [ -f ".env.${ENVIRONMENT}" ]; then
        export $(cat .env.${ENVIRONMENT} | xargs)
        log_info "Loaded .env.${ENVIRONMENT}"
    elif [ -f ".env" ]; then
        export $(cat .env | xargs)
        log_info "Loaded .env"
    else
        log_warn "No environment file found"
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build -t ${PROJECT_NAME}:${VERSION} .
    
    if [ $? -eq 0 ]; then
        log_info "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Run unit tests
    npm test
    
    if [ $? -eq 0 ]; then
        log_info "Tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Deploy with Docker Compose
deploy_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down
    
    # Pull latest images
    docker-compose pull
    
    # Start services
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_info "Services started successfully"
    else
        log_error "Failed to start services"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        
        log_warn "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Setup SSL certificates
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    if [ ! -d "ssl" ]; then
        mkdir ssl
    fi
    
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        log_warn "SSL certificates not found, generating self-signed certificates..."
        
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=CM/ST=Southwest/L=Buea/O=TenantSphere/CN=localhost"
        
        log_info "Self-signed certificates generated"
    else
        log_info "SSL certificates found"
    fi
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create Grafana directories
    mkdir -p grafana/dashboards grafana/datasources
    
    # Create Grafana datasource configuration
    cat > grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log_info "Monitoring setup complete"
}

# Backup data
backup_data() {
    log_info "Creating backup..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $backup_dir
    
    # Backup Redis data
    if docker ps | grep -q redis; then
        docker exec redis redis-cli BGSAVE
        docker cp redis:/data/dump.rdb $backup_dir/
        log_info "Redis backup created"
    fi
    
    # Backup logs
    if [ -d "logs" ]; then
        cp -r logs $backup_dir/
        log_info "Logs backup created"
    fi
    
    log_info "Backup created in $backup_dir"
}

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    if [ -d "backups" ]; then
        find backups -type d -mtime +7 -exec rm -rf {} +
        log_info "Old backups cleaned up"
    fi
}

# Main deployment process
main() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    load_environment
    
    # Create backup before deployment
    backup_data
    
    # Setup SSL and monitoring
    setup_ssl
    setup_monitoring
    
    # Build and test
    build_image
    run_tests
    
    # Deploy
    deploy_compose
    
    # Verify deployment
    if health_check; then
        log_info "✅ Deployment completed successfully!"
        log_info "Application is running at:"
        log_info "  - HTTP: http://localhost"
        log_info "  - HTTPS: https://localhost"
        log_info "  - Grafana: http://localhost:3001 (admin/admin123)"
        log_info "  - Prometheus: http://localhost:9090"
    else
        log_error "❌ Deployment failed health check"
        
        # Show logs for debugging
        log_info "Showing recent logs:"
        docker-compose logs --tail=50
        
        exit 1
    fi
    
    # Cleanup
    cleanup_backups
    
    log_info "🎉 Deployment process completed!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_data
        ;;
    "health")
        health_check
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "stop")
        log_info "Stopping services..."
        docker-compose down
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose restart
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|logs|stop|restart}"
        echo "  deploy  - Full deployment process (default)"
        echo "  backup  - Create backup only"
        echo "  health  - Run health check only"
        echo "  logs    - Show and follow logs"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        exit 1
        ;;
esac
