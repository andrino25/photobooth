import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import PhotoBooth from './components/Photbooth'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <PhotoBooth />
    </>
  )
}

export default App
