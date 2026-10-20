import { Config } from '@remotion/cli/config';

Config.setOverwriteOutput(true);
Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('angle');
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: { ...config.module, rules: [...(config.module?.rules ?? []), { test: /\.m?js$/, resolve: { fullySpecified: false } }] }
}));
