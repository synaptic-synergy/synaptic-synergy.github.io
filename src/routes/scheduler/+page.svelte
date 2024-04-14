<script>
	import { buildURL } from '$lib';

	function login() {
		const queryParams = {
			client_id: '163691415601-9dkcmmbel076laqtobf51j29u4nduq3a.apps.googleusercontent.com',
			redirect_uri: window.location.href,
			response_type: 'token',
			scope: 'https://www.googleapis.com/auth/youtube'
		};
		window.location.href = buildURL(`https://accounts.google.com/o/oauth2/v2/auth`, queryParams);
	}
</script>

<button onclick={login}>Login</button>
