import { createServer } from 'http';
import { Server } from 'socket.io';
import Express from 'express';
import cors from 'cors';

const app = Express();
app.use(cors({ origin: '*', credentials: true }));

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Interview state map
const interviewStateMap = new Map();

// Function to add/update interview state
function setInterviewState(interviewId, interviewerState, candidateState) {
  interviewStateMap.set(interviewId, {
    interviewer: interviewerState,
    student: candidateState,
  });
}

// Function to get the state of an interview
function getInterviewState(interviewId) {
  // Return default if not present
  return interviewStateMap.get(interviewId) || { interviewer: false, student: false };
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('a user disconnected');
  });

  // ✅ Join room using interviewId
  socket.on('join', (data) => {
    const { interviewId, role } = data;
    console.log(interviewId)
    socket.join(interviewId);
    socket.interviewId = interviewId;
    console.log(`Socket ${socket.id} joined room ${interviewId}`);

    let state = getInterviewState(interviewId);

    if (role === 'student') {
      setInterviewState(interviewId, state.interviewer, true);
      if (state.interviewer) {
        socket.to(interviewId).emit('both-joined');
        socket.broadcast.emit('both-joined');
      }
    } else if (role === 'interviewer') {
      setInterviewState(interviewId, true, state.student);
      if (state.student) {
        socket.to(interviewId).emit('both-joined');
        socket.emit('both-joined');
      }
    }
  });
  socket.on('code-result',(data)=>{
    console.log("hello")
    const {interviewId}=data;
    console.log("code result"+interviewId)
    console.log(data)
    socket.to(interviewId).emit('code-result',data);
  })
socket.on('fullscreen-exit',(data)=>{
  const {interviewId}=data;
  socket.to(interviewId).emit('fullscreen-exit');
})
socket.on("fullscreen-enter", (data) => {
  const { interviewId } = data;
  // Emit 'fullscreen-enter' to all clients in the same interview room
  socket.to(interviewId).emit("fullscreen-enter");
});

  // ✅ Send offer
  socket.on('offer', (offer) => {
    const room = socket.interviewId;
    console.log(offer.interviweId)
   // console.log(offer);
    if (room) {
      socket.to(offer.interviweId).emit('offer-msg', offer.offer);
    }
  });

  // ✅ Send answer
  socket.on('answer', (answer) => {
   //const { answer, interviewId }=answer;
   console.log("answer"+answer.interviewId)
      socket.to(answer.interviewId).emit('answer-msg', answer.answer);
    
  });
  socket.on('End',(interviewId)=>{
    socket.to(interviewId).emit('End');
  })
  // ✅ ICE candidate
  socket.on('send-candidate', (data) => {
    
      socket.to(data.interviewId).emit('receive-candidate', data.data);
   
  });

  // ✅ Warnings
  socket.on('give-warning', () => {
    const room = socket.interviewId;
    if (room) {
      socket.to(room).emit('receive-warning');
    }
  });

  // ✅ End interview
  socket.on('end-interview', () => {
    const room = socket.interviewId;
    if (room) {
      socket.to(room).emit('interview-ended');
    }
  });
});

// Optional: Initialize a test interview if needed
// setInterviewState('123', false, false);

server.listen(3001, () => {
  console.log('listening on port 3001');
});
