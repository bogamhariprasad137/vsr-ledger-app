from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.database import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS - allow React frontend origin
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.students import students_bp
    from app.routes.installments import installments_bp
    from app.routes.receipts import receipts_bp
    from app.routes.reports import reports_bp
    from app.routes.notifications import notifications_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(installments_bp, url_prefix='/api/installments')
    app.register_blueprint(receipts_bp, url_prefix='/api/receipts')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # Root route for sanity check
    @app.route('/')
    @app.route('/api')
    def index():
        return jsonify({
            "success": True,
            "message": "FirstCry Intellitots Fee Tracker REST API is running.",
            "database": app.config['DB_NAME'],
            "db_host": app.config['DB_HOST']
        })
        
    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Global server exception: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Server Error: {str(e)}"
        }), 500
        
    # Initialize and seed database tables
    init_db(app)
    
    return app
