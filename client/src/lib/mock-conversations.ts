import type { Conversation } from "@/types/chat"

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)

export const mockConversations: Conversation[] = [
  {
    id: "1",
    title: "Optimize drug production schedule",
    createdAt: new Date(today.getTime() + 2 * 60 * 60 * 1000),
    updatedAt: new Date(today.getTime() + 2 * 60 * 60 * 1000),
    messages: [
      {
        id: "1-1",
        role: "user",
        content:
          "I need to optimize the production schedule for a pharmaceutical company. We have 3 production lines, 5 different drugs to manufacture, and various constraints on production time and storage capacity.",
        timestamp: new Date(today.getTime() + 2 * 60 * 60 * 1000),
        type: "text",
      },
      {
        id: "1-2",
        role: "assistant",
        content:
          "I understand you're looking to optimize pharmaceutical production scheduling. This is a classic mixed-integer linear programming (MILP) problem. Let me break down the key components:\n\n**Decision Variables:**\n- x_{i,j,t} = quantity of drug i produced on line j at time t\n- y_{i,j,t} = binary variable (1 if drug i is assigned to line j at time t)\n\n**Objective:** Minimize total production cost while meeting demand\n\n**Constraints:**\n- Production capacity per line\n- Storage capacity limits\n- Demand satisfaction\n- Changeover times between different drugs",
        timestamp: new Date(today.getTime() + 2 * 60 * 60 * 1000 + 30000),
        type: "model",
        actions: [
          { label: "Accept Model", variant: "primary" },
          { label: "Modify Constraints", variant: "secondary" },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Resource allocation for IT projects",
    createdAt: new Date(today.getTime() - 1 * 60 * 60 * 1000),
    updatedAt: new Date(today.getTime() - 1 * 60 * 60 * 1000),
    messages: [
      {
        id: "2-1",
        role: "user",
        content: "Help me allocate developers across 4 projects with different skill requirements.",
        timestamp: new Date(today.getTime() - 1 * 60 * 60 * 1000),
        type: "text",
      },
    ],
  },
  {
    id: "3",
    title: "Supply chain network design",
    createdAt: yesterday,
    updatedAt: yesterday,
    messages: [
      {
        id: "3-1",
        role: "user",
        content: "Design optimal warehouse locations for a retail distribution network.",
        timestamp: yesterday,
        type: "text",
      },
    ],
  },
  {
    id: "4",
    title: "Portfolio optimization strategy",
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
    messages: [
      {
        id: "4-1",
        role: "user",
        content: "Optimize investment portfolio with risk constraints.",
        timestamp: threeDaysAgo,
        type: "text",
      },
    ],
  },
  {
    id: "5",
    title: "Vehicle routing problem",
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
    messages: [
      {
        id: "5-1",
        role: "user",
        content: "Optimize delivery routes for a fleet of 10 trucks across 50 locations.",
        timestamp: fiveDaysAgo,
        type: "text",
      },
    ],
  },
  {
    id: "6",
    title: "Workforce scheduling",
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
    messages: [
      {
        id: "6-1",
        role: "user",
        content: "Create optimal shift schedules for hospital nurses.",
        timestamp: tenDaysAgo,
        type: "text",
      },
    ],
  },
  {
    id: "7",
    title: "Inventory management model",
    createdAt: twentyDaysAgo,
    updatedAt: twentyDaysAgo,
    messages: [
      {
        id: "7-1",
        role: "user",
        content: "Optimize inventory levels across multiple warehouses.",
        timestamp: twentyDaysAgo,
        type: "text",
      },
    ],
  },
]

export const examplePrompts = [
  {
    title: "Production Scheduling",
    description: "Optimize manufacturing schedules across multiple production lines",
    prompt:
      "I need to optimize production scheduling for a manufacturing plant with 4 production lines and 10 products.",
  },
  {
    title: "Resource Allocation",
    description: "Allocate limited resources across competing projects",
    prompt:
      "Help me allocate a team of 20 developers across 5 projects with different skill requirements and deadlines.",
  },
  {
    title: "Supply Chain Optimization",
    description: "Design efficient logistics and distribution networks",
    prompt: "Design an optimal distribution network for a company with 3 factories and 50 retail locations.",
  },
  {
    title: "Portfolio Optimization",
    description: "Balance risk and return in investment portfolios",
    prompt: "Create an optimal investment portfolio with $1M budget, targeting 8% return with minimal risk.",
  },
]
