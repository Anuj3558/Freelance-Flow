import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import './App.css';
import Home from './app/page';
import { NotificationProvider } from './components/ui/notification';
function App() {
    return (_jsx(_Fragment, { children: _jsx(NotificationProvider, { children: _jsx(Home, {}) }) }));
}
export default App;
