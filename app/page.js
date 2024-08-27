'use client'
import Image from "next/image";
import { useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
    }
  ])

  const [message, setMessage] = useState('')

  const sendMessage = async() => {
    setMessages((messages) => {[
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''}
    ]})

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
          return result
        } 
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1]
          lastMessage.content += text
          return messages
        })
        return reader.read().then(processText)
      })
    })

    setMessage('')
  }

  return (
    <Box width='100vw' height='100vh' display='flex' flexDirection={'column'} justifyContent={'center'} alignItems={'center'}>
      <Stack direction={'column'} width={'80%'} height={'700px'} border={'1px solid #333'} p={2} spacing={3}>
        <Stack direction={'column'} width={'100%'} maxHeight={'100%'} spacing={2} flexGrow={1} overflow={'auto'}>
          {
            messages.map((message, index) => (
              <Box key={index} display='flex' justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Box bgcolor={message.role === 'user' ? 'secondary.main' : 'primary.main'} color='white' borderRadius={8} p={2}>
                  {message.content}
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
