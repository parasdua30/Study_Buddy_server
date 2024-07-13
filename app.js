import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import { corsOptions } from "./constants/config.js";
dotenv.config({
    path: "./.env",
});

const PORT = 8000 || process.env.PORT;

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(cors(corsOptions));
const io = new Server(server, { cors: corsOptions });

app.set("io", io);

// <---------- SOCKET ---------->
const userToSocketIdMap = new Map();
const socketidToUserMap = new Map();

io.on("connection", (socket) => {
    console.log("Connected", socket.id);

    // Video Call
    socket.on("room:join", (data) => {
        const { username, room } = data;
        userToSocketIdMap.set(username, socket.id);
        socketidToUserMap.set(socket.id, username);

        io.to(room).emit("user:joined", { username, id: socket.id });
        socket.join(room);
        io.to(socket.id).emit("room:join", data);
    });

    socket.on("user:call", ({ to, offer }) => {
        io.to(to).emit("incomming:call", { from: socket.id, offer });
    });

    socket.on("call:accepted", ({ to, ans }) => {
        io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    socket.on("peer:nego:needed", ({ to, offer }) => {
        // console.log("peer:nego:needed", offer);
        io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
        // console.log("peer:nego:done", ans);
        io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });

    // WhiteBoard
    socket.on("using:whiteboard", ({ fellowUsername }) => {
        // console.log("using:whiteboard", fellowUsername);
        socket.broadcast.emit("fellow:using:whiteboard", { fellowUsername });
    });

    socket.on("beginPath", (arg) => {
        socket.broadcast.emit("beginPath", arg);
    });

    socket.on("drawLine", (arg) => {
        socket.broadcast.emit("drawLine", arg);
    });

    socket.on("endPath", () => {
        socket.broadcast.emit("endPath");
    });

    socket.on("changeConfig", (arg) => {
        socket.broadcast.emit("changeConfig", arg);
    });

    socket.on("undo", () => {
        socket.broadcast.emit("undo");
    });

    socket.on("redo", () => {
        socket.broadcast.emit("redo");
    });

    socket.on("clear", () => {
        socket.broadcast.emit("clear");
    });

    // CodeEditor
    socket.on("using:editor", ({ fellowUsername }) => {
        socket.broadcast.emit("fellow:using:editor", { fellowUsername });
    });
});

function error(err, req, res, next) {
    if (!test) console.error(err.stack);

    res.status(500);
    res.send("Internal Server Error");
}

app.use(error);
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
