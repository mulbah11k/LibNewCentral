const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

// Check if the platform is already set to 'node'
if (tf.ENV.flags.IS_NODE !== true) {
    tf.ENV.setPlatform('node', new tf.platforms.NodePlatform());
}

module.exports = { tf, use };