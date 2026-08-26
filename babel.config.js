module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Lets drizzle/migrations.js import .sql files as strings.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
