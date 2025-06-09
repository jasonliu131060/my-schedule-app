import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  getDoc, 
  query, 
  getDocs, 
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- UI Icons ---
const TrashIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ChevronLeftIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
      <path d="m15 18-6-6 6-6" />
  </svg>
);
const ChevronRightIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
  </svg>
);
const GripVerticalIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400">
        <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
);
const GoogleIcon = () => (
    <svg className="mr-2 -ml-1 w-4 h-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.8 0 265.5S110.3 19 244 19c70.3 0 126.5 27.8 172.9 69.6L363.7 129.1c-22.5-24.3-53.4-39.8-90.1-39.8-73.8 0-133.2 60.1-133.2 133.8s59.4 133.8 133.2 133.8c76.9 0 119.5-56.6 123.4-86.9H244v-66.2h244z"></path></svg>
);


// --- Reusable UI Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${className}`}>{children}</div>;
const CardHeader = ({ children, className = '' }) => <div className={`p-6 border-b border-gray-200 dark:border-gray-800 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }) => <h2 className={`text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 ${className}`}>{children}</h2>;
const CardDescription = ({ children, className = '' }) => <p className={`mt-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
const CardContent = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>;
const CardFooter = ({ children, className = '' }) => <div className={`p-6 pt-4 border-t border-gray-200 dark:border-gray-800 ${className}`}>{children}</div>;
const Checkbox = ({ id, checked, onChange, ...props }) => (
  <button role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className={`peer h-5 w-5 shrink-0 rounded-sm border border-gray-300 dark:border-gray-700 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300 transition-all duration-200 ${ checked ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900' : 'bg-transparent' }`} {...props}>
    {checked && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
  </button>
);
const Input = React.forwardRef(({ className = '', ...props }, ref) => <input ref={ref} className={`flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />);
const Button = ({ children, className = '', variant = 'primary', size = 'default', ...props }) => (
  <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300 ${ size === 'icon' ? 'h-10 w-10' : 'h-10 px-4 py-2' } ${ variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200' } ${className}`} {...props}>{children}</button>
);


// --- Main App Component ---
function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [completedDays, setCompletedDays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // **MODIFIED**: State for Firebase and the currently logged-in user
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const newTaskInputRef = useRef(null);
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  const toYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // **MODIFIED**: Initialize Firebase and listen for auth state changes
  useEffect(() => {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.projectId) return;

    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const authInstance = getAuth(app);
    setDb(firestore);
    setAuth(authInstance);

    onAuthStateChanged(authInstance, (currentUser) => {
      setUser(currentUser); // Set user to null if logged out, or user object if logged in
      setIsAuthReady(true);
    });
  }, []);

  // **MODIFIED**: Data fetching now depends on a valid user being logged in
  useEffect(() => {
    if (!isAuthReady || !db || !user) {
      setTasks([]); // Clear tasks if user logs out
      setCompletedDays([]);
      return;
    };
    
    const userId = user.uid;

    const tasksCollectionPath = `artifacts/${appId}/users/${userId}/tasks`;
    const q = query(collection(db, tasksCollectionPath), orderBy("order", "asc"));
    
    const unsubscribeTasks = onSnapshot(q, snapshot => {
        let fetchedTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const tasksWithoutOrder = fetchedTasks.filter(t => t.order === undefined);
        if (tasksWithoutOrder.length > 0) {
            const batch = writeBatch(db);
            const sorted = fetchedTasks.sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            sorted.forEach((task, index) => {
                const docRef = doc(db, tasksCollectionPath, task.id);
                batch.update(docRef, { order: index });
            });
            batch.commit();
        }
        setTasks(fetchedTasks);
    });

    const daysCollectionPath = `artifacts/${appId}/users/${userId}/completedDays`;
    const unsubscribeDays = onSnapshot(query(collection(db, daysCollectionPath)), snapshot => {
      setCompletedDays(snapshot.docs.map(d => d.id));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeDays();
    };
  }, [db, user, isAuthReady, appId]);

  // --- Authentication Functions ---
  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  // --- Core App Functions (depend on user.uid) ---
  const addTask = async (e) => {
    e.preventDefault();
    if (newTask.trim() === '' || !db || !user) return;
    try {
      const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1 : 0;
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/tasks`), {
        text: newTask, time: newTaskTime, completed: false, createdAt: new Date(), order: newOrder
      });
      setNewTask('');
      setNewTaskTime('');
    } catch (error) { console.error('Error adding task: ', error); }
  };

  const toggleTask = async (task) => {
    if (!db || !user) return;
    try { await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/tasks/${task.id}`), { completed: !task.completed }); }
    catch (error) { console.error("Error toggling task:", error); }
  };

  const deleteTask = async (taskId) => {
    if (!db || !user) return;
    try { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/tasks/${taskId}`)); }
    catch (error) { console.error("Error deleting task:", error); }
  };
  
  const handleDragEnd = (event) => {
    const {active, over} = event;
    if (active.id !== over.id) {
      setTasks((currentTasks) => {
        const oldIndex = currentTasks.findIndex(item => item.id === active.id);
        const newIndex = currentTasks.findIndex(item => item.id === over.id);
        const newItems = arrayMove(currentTasks, oldIndex, newIndex);
        if (db && user) {
            const batch = writeBatch(db);
            newItems.forEach((item, index) => {
              const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/tasks/${item.id}`);
              batch.update(docRef, { order: index });
            });
            batch.commit().catch(err => console.error("Failed to update order:", err));
        }
        return newItems;
      });
    }
  };

  const handleFollowedSchedule = async () => { /* ... (remains the same but uses user.uid) ... */ };
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const allTasksCompleted = tasks.length > 0 && tasks.every(t => t.completed);
  const isTodayMarked = completedDays.includes(toYYYYMMDD(new Date()));

  // --- Conditional Rendering ---
  if (!isAuthReady) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-center">Welcome to My Schedule</CardTitle>
                    <CardDescription className="text-center">Sign in to sync your schedule across all devices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={signInWithGoogle} className="w-full">
                        <GoogleIcon /> Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // --- Main App View (Logged In) ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium">{user.displayName}</span>
            </div>
            <Button onClick={handleSignOut} variant="ghost" size="default">Sign Out</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
            <CardDescription>Drag and drop tasks to reorder them.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTask} className="flex flex-col sm:flex-row items-center gap-2 mb-6">
              <Input ref={newTaskInputRef} type="text" placeholder="New task description..." value={newTask} onChange={(e) => setNewTask(e.target.value)} className="flex-grow w-full" />
              <Input type="text" placeholder="Time (e.g. 10am, 2-4pm)" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="w-full sm:w-48" />
              <Button type="submit" className="w-full sm:w-auto">Add Task</Button>
            </form>
            <div className="space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                          <SortableTaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
          </CardContent>
          {tasks.length > 0 && <CardFooter><p className="text-xs text-center text-gray-500 dark:text-gray-400">{tasks.filter(t => t.completed).length} of {tasks.length} tasks completed.</p></CardFooter>}
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Progress Tracker</CardTitle>
            <CardDescription>Record the days you successfully follow your schedule.</CardDescription>
          </CardHeader>
          <CardContent><CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} completedDays={completedDays} toYYYYMMDD={toYYYYMMDD} /></CardContent>
          <CardFooter className="text-center">
            <Button onClick={handleFollowedSchedule} disabled={!allTasksCompleted || isTodayMarked} className="w-full">{isTodayMarked ? "Today's Progress Saved!" : "I Followed My Schedule Today"}</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// --- Sortable Task Item Component ---
function SortableTaskItem({ task, toggleTask, deleteTask }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: task.id});
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-900 shadow-sm">
            <div {...listeners} className="cursor-grab p-2">
                <GripVerticalIcon />
            </div>
            <Checkbox id={`task-${task.id}`} checked={task.completed} onChange={() => toggleTask(task)} />
            <div className="ml-3 flex-grow cursor-pointer" onClick={() => toggleTask(task)}>
              <label htmlFor={`task-${task.id}`} className={`font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.text}</label>
              {task.time && <p className="text-xs text-gray-500 dark:text-gray-400">{task.time}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"><TrashIcon className="h-4 w-4" /></Button>
        </div>
    );
}

// --- Calendar View Component ---
const CalendarView = ({ currentDate, setCurrentDate, completedDays, toYYYYMMDD }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: firstDayOfMonth }).map(() => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const changeMonth = (offset) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button onClick={() => changeMonth(-1)} variant="ghost" size="icon" aria-label="Previous month"><ChevronLeftIcon className="h-5 w-5" /></Button>
          <h3 className="text-lg font-semibold">{monthName} {year}</h3>
          <Button onClick={() => changeMonth(1)} variant="ghost" size="icon" aria-label="Next month"><ChevronRightIcon className="h-5 w-5" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {weekdays.map(day => <div key={day} className="font-medium text-gray-500 dark:text-gray-400">{day}</div>)}
          {daysArray.map((day, index) => {
            const dateStr = day ? toYYYYMMDD(new Date(year, month, day)) : '';
            const isCompleted = completedDays.includes(dateStr);
            const isToday = dateStr === toYYYYMMDD(new Date());
            return <div key={index} className={`w-10 h-10 flex items-center justify-center rounded-full ${isCompleted ? 'bg-green-500 text-white font-bold' : ''} ${isToday && !isCompleted ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>{day}</div>;
          })}
        </div>
      </div>
    );
  };

export default App;
