module.exports = function(app) {
  //send password reset link when requested
  app.models.User.on('resetPasswordRequest', function(info) {
    var url = 'http://' + 'localhost' + ':' + '4200' + '/reset-password';
    //TODO: Need to pass url of live sr app
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    app.models.Email.send({
      to: info.email,
      subject: 'Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      else console.log('> sending password reset email to:', info.email);
    });
  });
};
