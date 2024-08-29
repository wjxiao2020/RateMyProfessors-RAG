'use client'

import { useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Rate My Professors support assistant. How can I help you today?"
    }
  ])

  const [message, setMessage] = useState('')

  const sendMessage = async() => {
    setMessages((messages) => [
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''}
    ])
    
    const response = fetch('api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = ''
      return reader.read().then(function processText({done, value}){
        if (done) {
          return
        } 
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        result += text
        setMessages((messages) => {
          // copy the current messages list then update the content of the last message
          const newMessages = [... messages]
          newMessages[newMessages.length - 1].content = result

          return newMessages
        })
        return reader.read().then(processText)
      })
    })

    setMessage('')
  }

  return (
    <Box minWidth='100vw' minHeight='100vh' display='flex' flexDirection={'column'} justifyContent={'center'} alignItems={'center'} overflow={'auto'}>
      <Image 
        src="https://www.ratemyprofessors.com/static/media/big_rmp_logo_black.41f961d6.svg" 
        alt="Logo"
        width={500} 
        height={100}
      />
      
      <Stack direction={'column'} width={'80%'} height={'600px'} border={'1px solid #333'} p={2} spacing={3}>
        <Stack direction={'column'} width={'100%'} maxHeight={'100%'} spacing={2} flexGrow={1} overflow={'auto'} paddingRight={'5px'}
          sx={{
            // border: '1px solid #ccc', // Add a border to visualize the chat window
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent', // Make the scrollbar track background transparent
            },
            '&::-webkit-scrollbar': {
              width: '8px', // Customize the scrollbar width
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888', // Customize the scrollbar thumb (the draggable part)
              borderRadius: '4px',     // Add some rounding to the scrollbar thumb
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: '#555', // Darken the scrollbar thumb on hover
            },
          }}>
          {
            messages.map((message, index) => (
              <Box key={index} display='flex' justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Box dangerouslySetInnerHTML={{ __html: message.content }} bgcolor={message.role === 'user' ? 'primary.main' : 'grey'} color='white' borderRadius={8} p={2}>
                </Box>
              </Box>
            ))
          }
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField label='Message' fullWidth value={message} onChange={(e) => {setMessage(e.target.value)}} />
          <Button variant="outlined" onClick={sendMessage}>Send</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
