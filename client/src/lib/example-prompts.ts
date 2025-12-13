export const examplePrompts = [
    {
        title: "Construction Scheduling",
        description: "Optimize project timelines and resource allocation.",
        prompt: "A construction company is planning the development of a new residential estate consisting of 3 zones: A, B, and C. The construction of Zone A takes 4 months, Zone B takes 6 months, and Zone C takes 5 months. Due to logistical constraints, Zone B cannot start until Zone A is at least 50% complete. Zone C cannot start until Zone A is fully finished. Additionally, the company has a maximum of 200 workers available per month. Zone A requires 40 workers/month, Zone B requires 50 workers/month, and Zone C requires 30 workers/month. The company wants to minimize the total duration of the project (make-span) while adhering to these dependencies and labor constraints. Formulate this as a Linear Programming problem to determine the start times for each zone."
    },
    {
        title: "Logistics Network",
        description: "Minimize shipping costs between warehouses and plants.",
        prompt: "A logistics company transports steel from two warehouses (W1 and W2) to three manufacturing plants (P1, P2, and P3). Warehouse W1 has a stock of 100 tons, and W2 has 120 tons. Plant P1 requires 60 tons, P2 requires 70 tons, and P3 requires 50 tons. The transport costs per ton are: From W1: $10 to P1, $15 to P2, $20 to P3. From W2: $12 to P1, $8 to P2, $14 to P3. Determine how many tons of steel to transport from each warehouse to each plant to minimize the total transportation cost while meeting all plant demands and not exceeding warehouse stocks."
    },
    {
        title: "Workforce Assignment",
        description: "Assign the right developers to the right tasks.",
        prompt: "An IT consulting firm needs to assign 3 developers (Alice, Bob, Charlie) to 3 different projects (Frontend, Backend, DevOps). Each developer can work on exactly one project, and each project requires exactly one developer. Based on previous performance, the estimated completion time (in hours) for each developer on each project is: Alice: Frontend (10h), Backend (15h), DevOps (12h). Bob: Frontend (14h), Backend (10h), DevOps (9h). Charlie: Frontend (11h), Backend (13h), DevOps (11h). The goal is to assign developers to projects in a way that minimizes the total hours spent by the team. Formulate this as a binary linear programming problem."
    },
    {
        title: "Production Mix",
        description: "Find the most cost-effective ingredient blend.",
        prompt: "A farm wants to prepare a custom feed mix for cattle using two ingredients: Corn and Soybeans. Corn costs $0.20 per kg and contains 8% protein and 4% fiber. Soybeans cost $0.50 per kg and contain 40% protein and 3% fiber. The final feed mix must weigh at least 100 kg. It must contain at least 18% protein to ensure healthy growth, but no more than 5% fiber to prevent digestion issues. Determine the quantity (in kg) of Corn and Soybeans to use in the mix to minimize the total cost while satisfying the weight, protein, and fiber constraints."
    }
]
