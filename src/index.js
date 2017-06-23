import API from 'micro-api-client';
import User from './user';

const HTTPRegexp = /^http:\/\//;

export default class GoTrue {
  constructor(options = {}) {
    if (!options.APIUrl) {
      throw("You must specify an APIUrl of your GoTrue instance");
    }

    if (options.APIUrl.match(HTTPRegexp)) {
      console.log('Warning:\n\nDO NOT USE HTTP IN PRODUCTION FOR GOTRUE EVER!\nGoTrue REQUIRES HTTPS to work securely.')
    }

    if (options.Audience) {
      this.audience = options.Audience;
    }

    this.api = new API(options.APIUrl);
  }

  request(path, options){
    if (this.audience) {
      options.headers = options.headers || {};
      headers['X-JWT-AUD'] = this.audience;
    }
    return this.api.request(path, options)
  }

  signup(email, password, data) {
    return this.request('/signup', {
      method: 'POST',
      body: JSON.stringify({email, password, data})
    });
  }

  signupExternal(provider, code, data) {
    return this.request('/signup', {
      method: 'POST',
      body: JSON.stringify({provider, code, data})
    });
  }

  login(email, password, remember) {
    return this.request('/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `grant_type=password&username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    })
      .then((response) => {
        const user = new User(this.api, response, this.audience);
        user.persistSession(null)
        return user.reload();
      })
      .then((user) => {
        if (remember) {
          user.persistSession(user);
        }
        return user;
      });
  }

  loginExternal(provider, code, remember) {
    return this.request('/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `grant_type=authorization_code&code=${code}&provider=${provider}`
    })
      .then((response) => {
        const user = new User(this.api, response, this.audience);
        user.persistSession(null)
        return user.reload();
      })
      .then((user) => {
        if (remember) {
          user.persistSession(user);
        }
        return user;
      });
  }

  confirm(token) {
    return this.verify('signup', token);
  }

  requestPasswordRecovery(email) {
    return this.request('/recover', {
      method: 'POST',
      body: JSON.stringify({email})
    });
  }

  recover(token) {
    return this.verify('recovery', token);
  }

  user(tokenResponse) {
    return new User(this.api, tokenResponse);
  }

  currentUser() {
    return User.recoverSession();
  }

  verify(type, token) {
    return this.request('/verify', {
      method: 'POST',
      body: JSON.stringify({token, type})
    }).then((response) => new User(this.api, response).reload());
  }
}

if (typeof window !== "undefined") {
  window.GoTrue = GoTrue
}
