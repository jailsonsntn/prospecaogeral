/** @type {import('next').NextConfig} */
const securityHeaders = [
	{
		key: "X-Frame-Options",
		value: "DENY",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
	{
		key: "Referrer-Policy",
		value: "strict-origin-when-cross-origin",
	},
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(self)",
	},
	{
		key: "Cross-Origin-Opener-Policy",
		value: "same-origin",
	},
];

const nextConfig = {
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: securityHeaders,
			},
		];
	},
};
module.exports = nextConfig;
