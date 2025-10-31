'use client'

import ProductLayout from "@/components/layout/ProductLayout"
import CollaborationAnimationAutoPlay from "@/components/ui/collaboration-animation"
import { TeamMemberCard, type TeamMemberData } from "@/components/ui/team-member-card"
import { Zap, Users, GitBranch, Shield } from "lucide-react"


const teamMembers: TeamMemberData[] = [
  { username: 'alex', fullName: 'Alex', role: 'owner', isOnline: true, avatarColor: 'bg-blue-500' },
  { username: 'sarah', fullName: 'Sarah', role: 'moderator', isOnline: true, avatarColor: 'bg-purple-500' },
  { username: 'mike', fullName: 'Mike', role: 'member', isOnline: true, avatarColor: 'bg-emerald-500' },
]

export default function TeamCollaborationPage() {
  const features = [
    {
      icon: <Users className="size-6" aria-hidden />,
      title: "Real-Time Collaboration",
      description: "Work simultaneously with your team on strategies, research, and code with live updates and presence indicators."
    },
    {
      icon: <GitBranch className="size-6" aria-hidden />,
      title: "Version Control",
      description: "Track changes, review modifications, and manage strategy versions with integrated Git-like workflow for trading algorithms."
    },
    {
      icon: <Shield className="size-6" aria-hidden />,
      title: "Role-Based Permissions",
      description: "Control access to strategies, data, and deployments with granular permissions for owners, moderators, and team members."
    }
  ]

  return (
    <ProductLayout
      icon={<Zap size={32} />}
      iconLabel="Team Collaboration"
      title={<>Build Better Strategies <br/>Together</>}
      description={<>Work together with your team to develop, test, and <br/>deploy trading strategies. <br/><br/>Share research, review code, and manage permissions <br/>all in one collaborative platform.</>}
      features={features}
    >
      <div className="relative w-full h-[600px]">
        {/*Main terminal*/}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[550px] z-20 bg-gradient-to-br from-gray-900 to-gray-950 rounded-lg border border-white/10">
          <CollaborationAnimationAutoPlay />
        </div>

        {/*Alex Owner Card*/}
        <div className="absolute top-[-8px] left-0 w-[58%] z-30">
          <TeamMemberCard member={teamMembers[0]} animated delay={300} />
        </div>

        {/*Sarah Moderator Card*/}
        <div className="absolute bottom-24 right-[-15%] w-[58%] z-30">
          <TeamMemberCard member={teamMembers[1]} animated delay={500} />
        </div>

        {/*Mike Member card*/}
        <div className="absolute bottom-4 left-[-8%] w-[58%] z-30">
          <TeamMemberCard member={teamMembers[2]} animated delay={700} />
        </div>
      </div>
    </ProductLayout>
  )
}
