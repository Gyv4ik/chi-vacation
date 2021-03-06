/*global Firebase: false, $: false*/
import { actions } from '../../constants/index.const'

export default class firebaseService {
	constructor ($firebaseObject, $firebase, $firebaseAuth, $q, $rootScope) {
		'ngInject';
		this.URL = 'https://vivid-fire-3850.firebaseio.com/users';
		this.$firebaseObject = $firebaseObject;
		this.$firebaseAuth = $firebaseAuth;
		this.$q = $q;
		this.$rootScope = $rootScope;
		this.userStorageKey = 'authUser';
		this.firebaseObj = new Firebase( this.URL );
		this.authUser = $.jStorage.get( this.userStorageKey ) || { status:false, data: false };
		this.userData = {};
	}

	_getClearObj(obj) {
		let newObj = {};
		angular.forEach(obj, 
			(value, key) => newObj[key] = value
		);	
		return newObj;
	}

	_getClearArray(arr) {
		let newArr = [];
		angular.forEach(arr, 
			value => newArr.push(value)
		);
		return newArr;
	}

	_getCurrentUid() {
		return this.authUser.data.uid;
	}

	checkPersmissions(arr) {
		return !!~arr.indexOf(this.authUser.role || 'anonim');
	}

	getUsersList() {
		let arr = this._getClearArray;
		let deferred = this.$q.defer();
		this.$firebaseObject( this.firebaseObj ).$loaded(
			data =>	deferred.resolve( arr(data) ),
			error => deferred.reject(error) );
		return deferred.promise;
	}

	loadUser() {
		let obj = this._getClearObj;
		let deferred = this.$q.defer();
		let userRef = this.firebaseObj.child(this.authUser.data.uid);
		let action = actions.userLoaded;
		this.$firebaseObject( userRef ).$loaded(
			data => {
				deferred.resolve( obj( data ) );
				this.$rootScope.$emit(action, data);
			},
			error => deferred.reject(error) );
		return deferred.promise;
	}

	getUserData() {
		return this.userData;
	}

	updateUserData(id, data) {
		let deferred = this.$q.defer();
		this.firebaseObj.update({ [id]: data }, 
			error => {
				if (error === null) {
					deferred.resolve({status: true})
				} else {
					deferred.reject({status: false, error: error})
				}
			}
		);
		return deferred.promise;
	}

	createUserByEmail(newUser) {
		let deferred = this.$q.defer();
		this.firebaseObj.createUser({
			email    : newUser.email,
			password : newUser.password
		}, (error, userData) => {
			if (error === null) {
				let user = angular.extend(this.defaultData, newUser, {uid: userData.uid});
				deferred.resolve(this.updateUserData(userData.uid, user))
			} else {
				deferred.reject({
					status: false,
					error: error
				});
			}
		});
		return deferred.promise;
	}
	
	signInUserByEmail(user) {
		let _this = this;
		let deferred = _this.$q.defer();
		this.firebaseObj.authWithPassword(user, function(error, data) {
			if (error === null) {
				_this.authUser.data = {};
				_this.authUser.data.uid = data.uid;
				_this.loadUser().then(signInSuccess, signInError)
			} else {
				signInError(error);
			}
		});
		return deferred.promise;

		function signInSuccess(data){
			_this.authUser = {
				status: true,
				data: data,
				role: data.role
			};
			_this.userData = data;
			deferred.resolve(_this.authUser);
			$.jStorage.set(_this.userStorageKey, _this.authUser);
		}
		
		function signInError(error){
			deferred.reject({
				status: false,
				error: error
			});
			_this.logOut();	
		}
	}

	deleteUser(email, password) {
		let deferred = this.$q.defer();
		this.firebaseObj.removeUser({
			email    : email,
			password : password
		}, error => {
			if (error === null) {
				deferred.resolve({status: true});
			} else {
				deferred.reject({
					status: false,
					error: error
				})
			}
		});
		return deferred.promise;
	}

	getUserState() {
		if (this.authUser.data) {
			let data = this.firebaseObj.getAuth();
			this.authUser = {
				status: data ? true : false,
				data: (data == null) ? {} : data,
				role: this.authUser.role
			};
			$.jStorage.set(this.userStorageKey, this.authUser);
		}
		return this.authUser.status;
	}

	logOut() {
		this.$firebaseAuth(this.firebaseObj).$unauth();
		$.jStorage.deleteKey(this.userStorageKey);
		this.authUser = {status: false, data: false}
	}

	getAuthUser() {
		return this.authUser.data;
	}

	changeUserPass(email, oldPassword, newPassword) {
		let deferred = this.$q.defer();
		this.firebaseObj.changePassword({
			email       : email,
			oldPassword : oldPassword,
			newPassword : newPassword
		}, error => {
			if (error === null) {
				deferred.resolve({status: true});
			} else {
				deferred.reject({status: false, error: error});
			}
		});
		return deferred.promise;
	}
	
	resetAndSendPassword(email) {
		let deferred = this.$q.defer();
		this.firebaseObj.resetPassword({
			email : email
		}, error => {
			if (error === null) {
				deferred.resolve({status: true});
			} else {
				deferred.reject({status: false, error: error});
			}
		});
		return deferred.promise;
	}

}

/*this.defaultData = {
			firstName: '',
			lastName: '',
			role: 'user',
			group: '',
			phone: '',
			email: '',
			uid: '',
			vacations: {
				total: 0,
				dayOff: 0,
				list: [{
					id: null,
					startDate: '',
					endDate: '',
					status: '',
					comments: ''
				}]
			}
		};*/

