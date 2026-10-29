import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [{source:'/api/portal/:path*',headers:[{key:'Cache-Control',value:'no-store, private'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Content-Type-Options',value:'nosniff'}]},{source:'/:path*',headers:[{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Content-Type-Options',value:'nosniff'}]}];},
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
