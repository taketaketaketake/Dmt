Detroit Builders Directory — System Plan                                                                                                       
                                                                                                                                                 
  ---                                                                                                                                            
  1. System Overview                                                                                                                             
                                                                                                                                                 
  What runs where                                                                                                                                
  ┌────────────┬────────────────────────────────┬────────────────────────────────────────────────────────┐                                       
  │ Component  │           Technology           │                     Responsibility                     │                                       
  ├────────────┼────────────────────────────────┼────────────────────────────────────────────────────────┤                                       
  │ Web server │ Fastify (Node.js + TypeScript) │ API routes, session management, serves static frontend │                                       
  ├────────────┼────────────────────────────────┼────────────────────────────────────────────────────────┤                                       
  │ Database   │ PostgreSQL via Prisma          │ Persistent data storage                                │                                       
  ├────────────┼────────────────────────────────┼────────────────────────────────────────────────────────┤                                       
  │ Frontend   │ React + Vite                   │ Static SPA, served by Fastify or deployed to CDN       │                                       
  ├────────────┼────────────────────────────────┼────────────────────────────────────────────────────────┤                                       
  │ Email      │ Resend                         │ Magic links, transactional notifications               │                                       
  ├────────────┼────────────────────────────────┼────────────────────────────────────────────────────────┤                                       
  │ Billing    │ Stripe                         │ Employer subscriptions for job posting                 │                                       
  └────────────┴────────────────────────────────┴────────────────────────────────────────────────────────┘                                       
  What talks to what                                                                                                                             
                                                                                                                                                 
  Browser                                                                                                                                        
     ↓ HTTPS                                                                                                                                     
  Fastify API (single server)                                                                                                                    
     ↓ Prisma Client                                                                                                                             
  PostgreSQL                                                                                                                                     
                                                                                                                                                 
  Fastify → Resend (outbound email)                                                                                                              
  Fastify → Stripe API (subscription management)                                                                                                 
  Stripe → Fastify (webhooks for payment events)                                                                                                 
                                                                                                                                                 
  Deployment model: Single server. No service mesh. No message queues. No background workers initially — if needed later, same codebase.
---
2. Core Domain Objects (revised)                                                                                                               
                                                                                                                                                 
  User                                                                                                                                           
                                                                                                                                                 
  - id                                                                                                                                           
  - email (unique)                                                                                                                               
  - status (pending | approved | suspended)                                                                                                      
  - isEmployer (boolean, toggled by Stripe)                                                                                                      
  - isAdmin (boolean)                                                                                                                            
  - createdAt                                                                                                                                    
  - lastLoginAt                                                                                                                                  
                                                                                                                                                 
  Roles are capabilities, not identities. A user can be both employer and admin simultaneously.                                                  
                                                                                                                                                 
  Profile                                                                                                                                        
                                                                                                                                                 
  - approvalStatus field applies here                                                                                                            
  - Projects inherit visibility from their creator's approved profile                                                                            
                                                                                                                                                 
  Project                                                                                                                                        
                                                                                                                                                 
  - No approval workflow                                                                                                                         
  - Visible if creator's profile is approved                                                                                                     
  - Abuse handled via moderation (flag/remove)                                                                                                   
                                                                                                                                                 
  New: UserFavorite                                                                                                                              
                                                                                                                                                 
  Private signal. Not visible to others.                                                                                                         
                                                                                                                                                 
  - id                                                                                                                                           
  - userId                                                                                                                                       
  - profileId                                                                                                                                    
  - createdAt                                                                                                                                    
                                                                                                                                                 
  New: ProjectFollow                                                                                                                             
                                                                                                                                                 
  Private signal. Not visible to others.                                                                                                         
                                                                                                                                                 
  - id                                                                                                                                           
  - userId                                                                                                                                       
  - projectId                                                                                                                                    
  - createdAt                                                                                                                                    
                                                                                                                                                 
  ---                                                                                                                                            
  3. User States and Roles (revised)                                                                                                             
                                                                                                                                                 
  Status (account state)                                                                                                                         
  ┌───────────┬────────────────────────────────────┐                                                                                             
  │  Status   │            Description             │                                                                                             
  ├───────────┼────────────────────────────────────┤                                                                                             
  │ pending   │ Signed up, awaiting admin approval │                                                                                             
  ├───────────┼────────────────────────────────────┤                                                                                             
  │ approved  │ Full platform access               │                                                                                             
  ├───────────┼────────────────────────────────────┤                                                                                             
  │ suspended │ Disabled by admin                  │                                                                                             
  └───────────┴────────────────────────────────────┘                                                                                             
  Capabilities (additive flags)                                                                                                                  
  ┌────────────┬────────────────────────────┬───────────────────────────┐                                                                        
  │    Flag    │        How acquired        │          Effect           │                                                                        
  ├────────────┼────────────────────────────┼───────────────────────────┤                                                                        
  │ isEmployer │ Active Stripe subscription │ Can post jobs             │                                                                        
  ├────────────┼────────────────────────────┼───────────────────────────┤                                                                        
  │ isAdmin    │ Set manually in database   │ Access to admin functions │                                                                        
  └────────────┴────────────────────────────┴───────────────────────────┘                                                                        
  Mental model                                                                                                                                   
                                                                                                                                                 
  - Everyone starts as a member (approved status)                                                                                                
  - Stripe subscription adds employer capability                                                                                                 
  - Admin is orthogonal — can be granted to anyone                                                                                               
  - No role churn on subscription changes                                                                                                        
                                                                                                                                                 
  ---                                                                                                                                            
  4. Frontend Page Map (revised)                                                                                                                 
                                                                                                                                                 
  Account section additions                                                                                                                      
  ┌───────────┬────────────────────┬───────────────────────────────────┬────────────────────┐                                                    
  │   Page    │        Path        │            Description            │    Data needed     │                                                    
  ├───────────┼────────────────────┼───────────────────────────────────┼────────────────────┤                                                    
  │ Favorites │ /account/favorites │ Private list of favorited people  │ Favorited profiles │                                                    
  ├───────────┼────────────────────┼───────────────────────────────────┼────────────────────┤                                                    
  │ Following │ /account/following │ Private list of followed projects │ Followed projects  │                                                    
  └───────────┴────────────────────┴───────────────────────────────────┴────────────────────┘                                                    
  Actions on directory pages                                                                                                                     
                                                                                                                                                 
  - Person detail: "Favorite" toggle (private)                                                                                                   
  - Project detail: "Follow" toggle (private)                                                                                                    
                                                                                                                                                 
  ---                                                                                                                                            
  5. Backend Responsibilities (revised)                                                                                                          
                                                                                                                                                 
  Approval workflow (simplified)                                                                                                                 
                                                                                                                                                 
  - Only profiles require approval                                                                                                               
  - Projects are immediately visible (if creator profile is approved)                                                                            
  - Moderation is reactive: admin can remove/hide projects after the fact                                                                        
                                                                                                                                                 
  Authorization (revised)                                                                                                                        
                                                                                                                                                 
  requireAuth        — valid session                                                                                                             
  requireApproved    — status === approved                                                                                                       
  requireEmployer    — isEmployer === true                                                                                                       
  requireAdmin       — isAdmin === true                                                                                                          
                                                                                                                                                 
  Capabilities stack. An admin employer passes all checks.                                                                                       
                                                                                                                                                 
  Search                                                                                                                                         
                                                                                                                                                 
  - Simple Postgres full-text search                                                                                                             
  - Indexed fields: profile name, profile handle, project title                                                                                  
  - Category filtering via exact match                                                                                                           
  - No external search service                                                                                                                   
  - No relevance scoring or tuning                                                                                                               
  - No fuzzy matching or typo tolerance                                                                                                          
                                                                                                                                                 
  Call it: indexed filtering, not a search product.                                                                                              
                                                                                                                                                 
  New endpoints                                                                                                                                  
                                                                                                                                                 
  POST   /api/favorites/:profileId    — add favorite                                                                                             
  DELETE /api/favorites/:profileId    — remove favorite                                                                                          
  GET    /api/favorites               — list own favorites                                                                                       
                                                                                                                                                 
  POST   /api/follows/:projectId      — follow project                                                                                           
  DELETE /api/follows/:projectId      — unfollow project                                                                                         
  GET    /api/follows                 — list own follows                                                                                         
                                                                                                                                                 
  ---                                                                                                                                            
  6. Explicit Non-Goals (revised)                                                                                                                
                                                                                                                                                 
  Clarification on signals                                                                                                                       
                                                                                                                                                 
  Allowed:                                                                                                                                       
  - Private favorites (people)                                                                                                                   
  - Private follows (projects)                                                                                                                   
                                                                                                                                                 
  Not allowed:                                                                                                                                   
  - Public follower counts                                                                                                                       
  - "Who favorited you" visibility                                                                                                               
  - Social graph queries                                                                                                                         
  - Feed generation from follows                                                                                                                 
                                                                                                                                                 
  These are personal bookmarks, not social features.                                                                                             
                                                                                                                                                 
  Search clarification                                                                                                                           
                                                                                                                                                 
  Allowed:                                                                                                                                       
  - Postgres FTS on name, handle, title                                                                                                          
  - Category exact-match filtering                                                                                                               
                                                                                                                                                 
  Not allowed:                                                                                                                                   
  - External search services (Algolia, Elasticsearch)                                                                                            
  - Relevance tuning or boosting                                                                                                                 
  - Typo tolerance                                                                                                                               
  - Search analytics                                                                                                                          --- 