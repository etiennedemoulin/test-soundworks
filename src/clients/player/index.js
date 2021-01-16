import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { Client } from '@soundworks/core/client';
import pluginAudioBufferLoaderFactory from '@soundworks/plugin-audio-buffer-loader/client';
import initQoS from '@soundworks/template-helpers/client/init-qos.js';

import pluginSyncFactory from '@soundworks/plugin-sync/client';
import pluginPlatformFactory from '@soundworks/plugin-platform/client';

import PlayerExperience from './PlayerExperience.js';

const config = window.soundworksConfig;
// store experiences of emulated clients
const experiences = new Set();

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

async function launch($container, index) {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // register plugins
    // -------------------------------------------------------------------
    client.pluginManager.register('platform', pluginPlatformFactory, {
      features: [
        ['web-audio', audioContext],
      ]
    }, []);

    client.pluginManager.register('audio-buffer-loader', pluginAudioBufferLoaderFactory, {
  // declare files that should be loading when Experience starts, if any
      data: {
        '1': 'sounds/SoniaBerbec.mp3',
      }
    }, []);

    // `getTimeFunction` makes use of the `audioContext.currentTime`
    // to synchronize according to the audio clock reference.
    // The last argument define the platform plugin as a dependency of the
    // sync plugin, so that sync process starts with a resumed audio clock.
    client.pluginManager.register('sync', pluginSyncFactory, {
      getTimeFunction: () => audioContext.currentTime,
    }, ['platform']);

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------
    await client.init(config);
    initQoS(client);

    const experience = new PlayerExperience(client, config, $container, audioContext);
    // store exprience for emulated clients
    experiences.add(experience);

    document.body.classList.remove('loading');

    // start all the things
    await client.start();
    experience.start();

    return Promise.resolve();
  } catch(err) {
    console.error(err);
  }
}

// -------------------------------------------------------------------
// bootstrapping
// -------------------------------------------------------------------
const $container = document.querySelector('#__soundworks-container');
const searchParams = new URLSearchParams(window.location.search);
// enable instanciation of multiple clients in the same page to facilitate
// development and testing (be careful in production...)
const numEmulatedClients = parseInt(searchParams.get('emulate')) || 1;

// special logic for emulated clients (1 click to rule them all)
if (numEmulatedClients > 1) {
  for (let i = 0; i < numEmulatedClients; i++) {
    const $div = document.createElement('div');
    $div.classList.add('emulate');
    $container.appendChild($div);

    launch($div, i);
  }

  const $initPlatformBtn = document.createElement('div');
  $initPlatformBtn.classList.add('init-platform');
  $initPlatformBtn.textContent = 'resume all';

  function initPlatforms(e) {
    experiences.forEach(experience => {
      if (experience.platform) {
        experience.platform.onUserGesture(e)
      }
    });
    $initPlatformBtn.removeEventListener('touchend', initPlatforms);
    $initPlatformBtn.removeEventListener('mouseup', initPlatforms);
    $initPlatformBtn.remove();
  }

  $initPlatformBtn.addEventListener('touchend', initPlatforms);
  $initPlatformBtn.addEventListener('mouseup', initPlatforms);

  $container.appendChild($initPlatformBtn);
} else {
  launch($container, 0);
}
