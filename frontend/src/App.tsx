
import './App.css'
import Home from './app/page'
import { NotificationProvider } from './components/ui/notification'

function App() {

  return (
    <>
    <NotificationProvider>
      <Home />
    </NotificationProvider>
      
    </>
  )
}

export default App
