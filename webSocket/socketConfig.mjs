let ioInstance;

export function initializeSockets(server) {
  import('socket.io').then(({ Server }) => {
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    ioInstance = io;

    io.on("connection", (socket) => {
      console.log("🔌 User connected:", socket.id);

      socket.on("join", (roomId) => {
        socket.join(roomId);
      });

      socket.on("send_message", (data) => {
        // broadcast to other users in the same room
        socket.to(data.roomId).emit("receive_message", data);
      });

      socket.on("disconnect", () => {
        console.log(" User disconnected:", socket.id);
      });
    });
  });
}

export function getIoInstance() {
  return ioInstance;
}
