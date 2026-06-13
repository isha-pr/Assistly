const mediasoup = require('mediasoup');

// Mediasoup Configuration
const config = {
  // Worker settings
  worker: {
    rtcMinPort: 20000,
    rtcMaxPort: 20100,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
  },
  // Router settings
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
        },
      },
    ],
  },
  // WebRtcTransport settings
  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};

let worker;

async function getWorker() {
  if (!worker) {
    worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on('died', (error) => {
      console.error('mediasoup worker died, exiting in 2 seconds...', error);
      setTimeout(() => process.exit(1), 2000);
    });

    console.log(`mediasoup worker created successfully, PID: ${worker.pid}`);
  }
  return worker;
}

async function createRouter() {
  const activeWorker = await getWorker();
  const router = await activeWorker.createRouter({
    mediaCodecs: config.router.mediaCodecs,
  });
  return router;
}

async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: config.webRtcTransport.listenIps,
    enableUdp: config.webRtcTransport.enableUdp,
    enableTcp: config.webRtcTransport.enableTcp,
    preferUdp: config.webRtcTransport.preferUdp,
    initialAvailableOutgoingBitrate: 1000000,
  });

  // Handle transport close or DTLS changes if necessary
  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'failed' || dtlsState === 'closed') {
      console.warn(`WebRtcTransport DTLS state changed to ${dtlsState}, closing transport.`);
      transport.close();
    }
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

module.exports = {
  getWorker,
  createRouter,
  createWebRtcTransport,
};
