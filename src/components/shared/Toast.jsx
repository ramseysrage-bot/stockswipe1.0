import { useApp } from '../../store/AppContext'

export default function Toast() {
  const { toastMsg } = useApp()
  return (
    <div className={`toast${toastMsg ? ' visible' : ''}`}>
      {toastMsg}
    </div>
  )
}
