"use strict";
/* Controllers */
(function () {
	// ...

	app.controller('AuthCtrl', function ($scope, UserService, socketio, ProjectService, AuthenticationService, $mdDialog, $routeParams,
		$route, $location, $rootScope, $cookieStore, $auth, $mdToast, $analytics, $intercom) {
		$scope.errors = false;
		$scope.dataLoading = false;
		$scope.user = AuthenticationService.GetCredentials();
		if ($routeParams.type !== undefined) {
			$scope.authtype = $routeParams.type;
		}
		if ($cookieStore.get('redirect') !== undefined) {
			var foo = $cookieStore.get('redirect').link.split('/');
			if (foo[2] === 'view') {
				var id = foo[foo.length - 1];
				ProjectService.getOwner(id)
					.then(function (response) {
						if (response.success) {
							$scope.invite = true;
							$scope.name = response.user.fname + ' ' + response.user.lname;
						}
						$rootScope.$emit('fetchRdy');
					});
			}
		}

		$rootScope.$on('updateUser', function (event, data) {
			$scope.user = AuthenticationService.GetCredentials();
			$rootScope.user = AuthenticationService.GetCredentials();
		});

		$scope.register = function (user) {
			$scope.dataLoading = true;
			$scope.errors = false;
			$scope.postalIndex = false;
			UserService.Create(user)
				.then(function (response) {
					if (response.success) {
						angular.element('#regModal').modal('hide');
						angular.element('#regForm').trigger('reset');
						AuthenticationService.Login(user)
							.then(function (response) {
								if (response.success) {
									$analytics.eventTrack(analyticsConstants.register.event, analyticsConstants.register.details);
									$intercom.trackEvent(analyticsConstants.register.event, analyticsConstants.register.details);
									angular.element('.modal-backdrop').remove();
									angular.element('body').removeClass('modal-open');
									angular.element('body').css('padding-right', '0px');
									AuthenticationService.SetCredentials(response.user, 0);
									if ($rootScope.clientConstants.fbEnv === 'live') {
										$rootScope.$emit("showMandatory");
									}
									$rootScope.user = AuthenticationService.GetCredentials();
									var interUser = {
										email: $rootScope.user.email,
										name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
										user_id: $rootScope.user._id
									};
									$intercom.boot(interUser);
									$rootScope.socket = socketio.connect(fbUtil.getBaseAddress());
									$rootScope.socket.emit('register', {
										id: $rootScope.user._id,
										name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
										role: 'user'
									});
									if ($cookieStore.get('redirect') !== undefined) {
										$location.url($cookieStore.get('redirect').link);
										$cookieStore.remove('redirect');
									} else {
										$mdDialog.hide();
										$location.url('/projects');
										$cookieStore.remove('redirect');
									}
								} else {
									$scope.errors = true;
									$scope.dataLoading = false;
								}
							});
					} else {
						if (response.error.name === "UserExistsError") {
							$scope.errors = "This email already in use";
							$scope.dataLoading = false;
						}
					}
				});
		};

		$scope.socialLogin = function (provider) {
			$auth.authenticate(provider).then(function (response) {
				$analytics.eventTrack(analyticsConstants.socialLogin.event, analyticsConstants.socialLogin.details);
				$intercom.trackEvent(analyticsConstants.socialLogin.event, analyticsConstants.socialLogin.details);
				angular.element('.modal-backdrop').remove();
				angular.element('body').removeClass('modal-open').css('padding-right', '0px');
				AuthenticationService.SetCredentials([response.data.user], response.sub);
				$rootScope.user = AuthenticationService.GetCredentials();
				var interUser = {
					email: $rootScope.user.email,
					name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
					user_id: $rootScope.user._id
				};
				$intercom.boot(interUser);
				if ($rootScope.clientConstants.fbEnv === 'live') {
					if ($rootScope.user.sub === '0' || $rootScope.user.sub === 'undefined') {
						$rootScope.$emit("showMandatory");
					}
				}
				$rootScope.socket = socketio.connect(fbUtil.getBaseAddress());
				$rootScope.socket.emit('register', {
					id: $rootScope.user._id,
					name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
					role: 'user'
				});
				if ($rootScope.redirect) {
					$location.url($rootScope.redirect.link);
					$cookieStore.remove('redirect');
				} else {
					$mdDialog.hide();
					$location.url('/projects');
				}
			}).catch(function (err) {
				console.log(err);
				$scope.socErr = 'Error while authenticating with "' + provider + '"';
				$scope.socErrors = true;
				$scope.dataLoading = false;
			});
		};


		$scope.login = function (user) {
			$scope.dataLoading = true;
			$scope.errors = false;
			AuthenticationService.Login(user)
				.then(function (response) {
					if (response.success) {
						$analytics.eventTrack(analyticsConstants.login.event, analyticsConstants.login.details);
						$intercom.trackEvent(analyticsConstants.login.event, analyticsConstants.login.details);
						angular.element('.modal-backdrop').remove();
						angular.element('body').removeClass('modal-open');
						angular.element('body').css('padding-right', '0px');
						AuthenticationService.SetCredentials(response.user, response.sub);
						$rootScope.user = AuthenticationService.GetCredentials();
						var interUser = {
							email: $rootScope.user.email,
							name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
							user_id: $rootScope.user._id
						};
						$intercom.boot(interUser);
						if ($rootScope.clientConstants.fbEnv === 'live') {
							if ($rootScope.user.sub === '0' || $rootScope.user.sub === 'undefined') {
								$rootScope.$emit("showMandatory");
							}
						}
						$rootScope.socket = socketio.connect(fbUtil.getBaseAddress());
						$rootScope.socket.emit('register', {
							id: $rootScope.user._id,
							name: $rootScope.user.fname + ' ' + $rootScope.user.lname,
							role: 'user'
						});
						if ($cookieStore.get('redirect') !== undefined) {
							$mdDialog.hide();
							$location.url($cookieStore.get('redirect').link);
							$cookieStore.remove('redirect');
						} else {
							$mdDialog.hide();
							$location.url('/projects');
						}
					} else {
						$scope.errors = true;
						$scope.dataLoading = false;
					}
				});
		};

		$scope.recover = function () {
			$mdDialog.hide();
			$location.url('/recovery');
		};

		$scope.logout = function () {
			angular.element('title').html('------');
			$rootScope.user = undefined;
			AuthenticationService.ClearCredentials();
			$rootScope.$emit('fetchRdy');
			$location.url('/');
			$intercom.shutdown();
		};

		$scope.authorize = function () {
			$rootScope.redirect = {};
			$rootScope.redirect.link = $location.url();
			$location.url('/auth');
		};

		$scope.sendCode = function (email) {
			if (email !== undefined) {
				AuthenticationService.sendCode(email)
					.then(function (response) {
						if (response.success) {
							$location.url('/');
							$mdToast.show(
								$mdToast.simple()
								.textContent('Email was sent!')
								.position('top right')
								.hideDelay(3000)
							);
						}
					});
			}
		};

	});

	// ...
})();
