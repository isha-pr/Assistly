import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

const SERVER_URL = 'https://assistly-p527.onrender.com';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [peers, setPeers] = useState([]);
  
  // Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  // Device & Transports refs
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  
  // Producer & Consumer refs
  const videoProducerRef = useRef(null);
  const audioProducerRef = useRef(null);
  const consumersRef = useRef({}); // consumerId -> consumer

  // Control states
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Refs to keep track of room details for auto-reconnect
  const sessionIdRef = useRef(null);
  const nameRef = useRef(null);
  const roleRef = useRef(null);
  const joinedRef = useRef(false);
  const pendingProducersRef = useRef([]);

  // Initialize socket
  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => {
      console.log('Socket.IO connected to server');
      if (joinedRef.current && sessionIdRef.current) {
        console.log('Socket reconnected. Auto-rejoining session:', sessionIdRef.current);
        s.emit(
          'join-room',
          {
            sessionId: sessionIdRef.current,
            name: nameRef.current,
            role: roleRef.current,
          },
          (response) => {
            if (response.error) {
              console.error('Failed to auto-rejoin room after reconnect:', response.error);
            } else {
              console.log('Successfully auto-rejoined room after reconnect');
              if (response.peers) {
                setPeers(response.peers);
              }
            }
          }
        );
      }
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setErrorMsg('Failed to connect to the signaling server.');
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Set up socket listeners once socket is ready
  useEffect(() => {
    if (!socket) return;

    // Listen for new producers in the room
    socket.on('new-producer', async ({ socketId, producerId, kind }) => {
      console.log(`[DEBUG CLIENT] new-producer event received for producerId=${producerId} kind=${kind} from socketId=${socketId}`);
      console.log(`New producer detected: ${producerId} (${kind}) from ${socketId}`);
      if (recvTransportRef.current) {
        await consumeProducer(producerId);
      } else {
        console.log(`Recv transport not ready. Queuing producer: ${producerId}`);
        pendingProducersRef.current.push(producerId);
      }
    });

    // Listen for closed producers
    socket.on('producer-closed', ({ producerId }) => {
      console.log(`Producer closed on remote side: ${producerId}`);
      // Find consumer associated with this producer and close it
      const consumerEntry = Object.entries(consumersRef.current).find(
        ([_, c]) => c.producerId === producerId
      );
      if (consumerEntry) {
        const [cId, consumer] = consumerEntry;
        consumer.close();
        delete consumersRef.current[cId];
        
        // Refresh remote stream
        updateRemoteStream();
      }
    });

    // Listen for peer join/leave events
    socket.on('peer-joined', ({ socketId, name, role }) => {
      console.log(`Peer joined: ${name} (${role})`);
      setPeers((prev) => [...prev.filter((p) => p.socketId !== socketId), { socketId, name, role, isDisconnected: false }]);
    });

    socket.on('peer-disconnected', ({ socketId, name }) => {
      console.log(`Peer temporarily disconnected: ${name}`);
      setPeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isDisconnected: true } : p))
      );
      setRemoteStream(null);
    });

    socket.on('peer-reconnected', ({ socketId, oldSocketId, name, role }) => {
      console.log(`Peer reconnected: ${name} (${role})`);
      setPeers((prev) => [
        ...prev.filter((p) => p.socketId !== oldSocketId && p.socketId !== socketId),
        { socketId, name, role, isDisconnected: false }
      ]);
      // Restore remote stream
      updateRemoteStream();
    });

    socket.on('peer-left', ({ socketId, name }) => {
      console.log(`Peer left: ${name}`);
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
      
      // Clean up consumers for this peer
      // If the customer or agent leaves, we want to clear the remote feed
      setRemoteStream(null);
    });

    return () => {
      socket.off('new-producer');
      socket.off('producer-closed');
      socket.off('peer-joined');
      socket.off('peer-disconnected');
      socket.off('peer-reconnected');
      socket.off('peer-left');
    };
  }, [socket]);

  // Helper to re-generate the remote stream from active consumers
  const updateRemoteStream = () => {
    console.log('[DEBUG CLIENT] updateRemoteStream called');
    const stream = new MediaStream();
    let hasTracks = false;
    
    Object.values(consumersRef.current).forEach((consumer) => {
      if (consumer && consumer.track) {
        stream.addTrack(consumer.track);
        hasTracks = true;
      }
    });

    console.log(`[DEBUG CLIENT] remoteStream updating. hasTracks=${hasTracks} tracksCount=${stream.getTracks().length}`);
    if (hasTracks) {
      setRemoteStream(stream);
    } else {
      setRemoteStream(null);
    }
  };

  // 1. Join call and load Mediasoup Device
  const joinCall = async (sessionId, name, role) => {
    if (!socket) return;
    setConnecting(true);
    setErrorMsg(null);

    sessionIdRef.current = sessionId;
    nameRef.current = name;
    roleRef.current = role;

    // Get User Media first (optional but recommended to establish permissions early)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('[DEBUG CLIENT] getUserMedia success, stream tracks:', stream.getTracks().map(t => t.kind));
      setLocalStream(stream);
      setMicActive(true);
      setCamActive(true);
      setPermissionDenied(false);
    } catch (err) {
      console.warn('Could not access camera/microphone:', err);
      setPermissionDenied(true);
      // Create an empty stream or proceed without media (so client can at least join)
      stream = new MediaStream();
      setLocalStream(stream);
      setMicActive(false);
      setCamActive(false);
    }

    // Request to join room via Socket.IO
    socket.emit('join-room', { sessionId, name, role }, async (response) => {
      if (response.error) {
        console.error('Failed to join room:', response.error);
        setErrorMsg(response.error);
        setConnecting(false);
        return;
      }

      console.log('Joined room, loaded router capabilities:', response.routerRtpCapabilities);
      setPeers(response.peers);

      try {
        // Create Mediasoup Device
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: response.routerRtpCapabilities });
        deviceRef.current = device;

        console.log('Mediasoup device loaded successfully');

        // Create Transports
        await createSendTransport(sessionId, stream);
        await createRecvTransport(sessionId);

        setJoined(true);
        joinedRef.current = true;
        setConnecting(false);

        // After setting up recv transport, consume any existing producers in the room
        for (const peer of response.peers) {
          if (peer.producers) {
            for (const producerId of peer.producers) {
              await consumeProducer(producerId);
            }
          }
        }

        // Also consume any producers that were queued while setting up
        if (pendingProducersRef.current.length > 0) {
          console.log(`Consuming queued producers:`, pendingProducersRef.current);
          for (const producerId of pendingProducersRef.current) {
            await consumeProducer(producerId);
          }
          pendingProducersRef.current = [];
        }
      } catch (err) {
        console.error('Error loading mediasoup device/transports:', err);
        setErrorMsg('Error setting up WebRTC device.');
        setConnecting(false);
      }
    });
  };

  // 2. Create local Send Transport
  const createSendTransport = async (sessionId, stream) => {
    console.log('[DEBUG CLIENT] createSendTransport started');
    return new Promise((resolve, reject) => {
      socket.emit('createWebRtcTransport', { sessionId, direction: 'send' }, async (response) => {
        if (response.error) {
          return reject(new Error(response.error));
        }
        console.log('[DEBUG CLIENT] createSendTransport params received, local transport initialized');

        try {
          const transport = deviceRef.current.createSendTransport(response.params);
          sendTransportRef.current = transport;

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit(
              'connectWebRtcTransport',
              { sessionId, transportId: transport.id, dtlsParameters },
              (res) => {
                if (res.error) return errback(new Error(res.error));
                callback();
              }
            );
          });

          transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            console.log(`[DEBUG CLIENT] sendTransport on('produce') triggered for kind=${kind}`);
            socket.emit(
              'produce',
              { sessionId, transportId: transport.id, kind, rtpParameters },
              (res) => {
                if (res.error) return errback(new Error(res.error));
                console.log(`[DEBUG CLIENT] produce response received from server. producerId=${res.id}`);
                callback({ id: res.id });
              }
            );
          });

          console.log('Local Send Transport created');

          // Produce media tracks
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          if (videoTrack) {
            videoProducerRef.current = await transport.produce({ track: videoTrack });
          }
          if (audioTrack) {
            audioProducerRef.current = await transport.produce({ track: audioTrack });
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  };

  // 3. Create local Recv Transport
  const createRecvTransport = async (sessionId) => {
    console.log('[DEBUG CLIENT] createRecvTransport started');
    return new Promise((resolve, reject) => {
      socket.emit('createWebRtcTransport', { sessionId, direction: 'recv' }, async (response) => {
        if (response.error) {
          return reject(new Error(response.error));
        }
        console.log('[DEBUG CLIENT] createRecvTransport params received, local transport initialized');

        try {
          const transport = deviceRef.current.createRecvTransport(response.params);
          recvTransportRef.current = transport;

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit(
              'connectWebRtcTransport',
              { sessionId, transportId: transport.id, dtlsParameters },
              (res) => {
                if (res.error) return errback(new Error(res.error));
                callback();
              }
            );
          });

          console.log('Local Recv Transport created');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  };

  // 4. Consume a specific remote Producer
  const consumeProducer = async (producerId) => {
    console.log(`[DEBUG CLIENT] consumeProducer called for producerId=${producerId}`);
    if (!socket || !recvTransportRef.current || !deviceRef.current) return;
    
    // Check if we are already consuming this producer
    if (Object.values(consumersRef.current).some((c) => c.producerId === producerId)) {
      return;
    }

    const sessionId = sessionIdRef.current || '';
    
    socket.emit(
      'consume',
      {
        sessionId,
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
      },
      async (response) => {
        if (response.error) {
          console.warn('Failed to consume producer:', response.error);
          return;
        }

        console.log(`[DEBUG CLIENT] consume response received for producerId=${producerId} consumerId=${response.id}`);
        console.log('Received consume params:', response);

        try {
          const consumer = await recvTransportRef.current.consume({
            id: response.id,
            producerId: response.producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters,
          });

          console.log(`[DEBUG CLIENT] local consumer created successfully for consumerId=${consumer.id}`);
          consumersRef.current[consumer.id] = consumer;

          // Resume consumer on server
          console.log(`[DEBUG CLIENT] resumeConsumer emit for consumerId=${consumer.id}`);
          socket.emit('resumeConsumer', { sessionId, consumerId: consumer.id }, () => {
            console.log(`Consumer ${consumer.id} resumed on server`);
            console.log(`[DEBUG CLIENT] resumeConsumer response received from server for consumerId=${consumer.id}`);
            updateRemoteStream();
          });
        } catch (err) {
          console.error('Failed to create local consumer:', err);
        }
      }
    );
  };

  // Mute / Unmute Mic
  const toggleMic = () => {
    if (audioProducerRef.current) {
      if (micActive) {
        audioProducerRef.current.pause();
        setMicActive(false);
      } else {
        audioProducerRef.current.resume();
        setMicActive(true);
      }
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (videoProducerRef.current) {
      if (camActive) {
        videoProducerRef.current.pause();
        setCamActive(false);
      } else {
        videoProducerRef.current.resume();
        setCamActive(true);
      }
    }
  };

  // Clean exit
  const leaveCall = () => {
    if (socket) {
      socket.emit('leave-call'); // notify server
    }

    // Close producers/consumers
    if (videoProducerRef.current) videoProducerRef.current.close();
    if (audioProducerRef.current) audioProducerRef.current.close();
    Object.values(consumersRef.current).forEach((c) => c.close());
    consumersRef.current = {};

    // Close transports
    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();

    sendTransportRef.current = null;
    recvTransportRef.current = null;
    videoProducerRef.current = null;
    audioProducerRef.current = null;
    deviceRef.current = null;

    // Reset local/remote streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setJoined(false);
    joinedRef.current = false;
    setPeers([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        joined,
        connecting,
        peers,
        localStream,
        remoteStream,
        micActive,
        camActive,
        errorMsg,
        permissionDenied,
        joinCall,
        toggleMic,
        toggleCam,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
