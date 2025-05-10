class ErrorController {
    static handleError(req, res) {
      res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'Oops! The page you are looking for does not exist.'
      });
    }
  }
  
  module.exports = ErrorController;