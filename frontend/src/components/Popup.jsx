import styles from '../styles/Popup.module.css'
import AuthForm from './AuthForm'
import EventForm from './EventForm'

function Popup ({ method, onClose, route = null, event = {}, onSuccess }) {
  const renderContent = () => {
    switch (method) {
      case 'login':
        return <AuthForm route='/api/token/' method='login'/>;
      case 'register':
        return <AuthForm route='/api/register/' method='register'/>;
      case 'create_schedule':
        return <div>Create Schedule</div>;
      case 'create_event':
        return (
          <EventForm
            route={route}
            method="create"
            onClose={onClose}
            onSuccess={onSuccess}
          />
        );
      case 'edit_event':
        return (
          <EventForm
            route={route}
            method="edit"
            event={event}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        );
      case 'link_calendar':
        return <div>Link Calendar</div>;
      default:
        return <div>Unknown</div>;
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.content}>
        {renderContent()}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Popup;