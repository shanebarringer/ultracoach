import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

interface BulkWorkout {
  trainingPlanId: string
  date: string
  plannedType: string
  plannedDistance?: number | null
  plannedDuration?: number | null
  notes?: string
  category?: 'easy' | 'tempo' | 'interval' | 'long_run' | 'race_simulation' | 'recovery' | 'strength' | 'cross_training' | 'rest' | null
  intensity?: number | null
  terrain?: 'road' | 'trail' | 'track' | 'treadmill' | null
  elevationGain?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request)
    
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workouts }: { workouts: BulkWorkout[] } = await request.json()

    if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
      return NextResponse.json({ error: 'No workouts provided' }, { status: 400 })
    }

    // Verify all training plans belong to this coach
    const trainingPlanIds = [...new Set(workouts.map(w => w.trainingPlanId))]
    
    const { data: trainingPlans, error: plansError } = await supabaseAdmin
      .from('training_plans')
      .select('id, coach_id, runner_id')
      .in('id', trainingPlanIds)

    if (plansError) {
      console.error('Failed to verify training plans', plansError)
      return NextResponse.json({ error: 'Failed to verify training plans' }, { status: 500 })
    }

    // Check if all plans belong to this coach
    const unauthorizedPlans = trainingPlans?.filter(plan => plan.coach_id !== session.user.id)
    if (unauthorizedPlans && unauthorizedPlans.length > 0) {
      return NextResponse.json({ error: 'Unauthorized training plan access' }, { status: 403 })
    }

    // Delete existing workouts for the same dates to avoid duplicates
    const datesToClear = [...new Set(workouts.map(w => w.date))]
    
    for (const planId of trainingPlanIds) {
      const { error: deleteError } = await supabaseAdmin
        .from('workouts')
        .delete()
        .eq('training_plan_id', planId)
        .in('date', datesToClear)

      if (deleteError) {
        console.error('Failed to clear existing workouts', deleteError)
        // Continue anyway - we'll handle duplicates at insert
      }
    }

    // Prepare workouts for insertion
    const workoutsToInsert = workouts.map(workout => ({
      training_plan_id: workout.trainingPlanId,
      date: workout.date,
      planned_type: workout.plannedType,
      planned_distance: workout.plannedDistance,
      planned_duration: workout.plannedDuration,
      workout_notes: workout.notes || '',
      status: 'planned',
      workout_category: workout.category,
      intensity_level: workout.intensity,
      terrain_type: workout.terrain,
      elevation_gain_feet: workout.elevationGain
    }))

    // Bulk insert workouts
    const { data: insertedWorkouts, error: insertError } = await supabaseAdmin
      .from('workouts')
      .insert(workoutsToInsert)
      .select()

    if (insertError) {
      console.error('Failed to create workouts', insertError)
      return NextResponse.json({ error: 'Failed to create workouts' }, { status: 500 })
    }

    // Send notification to runner about new weekly plan
    if (insertedWorkouts && insertedWorkouts.length > 0) {
      try {
        // Get runner info from the training plan
        const firstPlan = trainingPlans?.find(plan => plan.id === workouts[0].trainingPlanId)
        if (firstPlan) {
          const { data: runner } = await supabaseAdmin
            .from('users')
            .select('id, full_name')
            .eq('id', firstPlan.runner_id)
            .single()

          if (runner) {
            // Get coach info
            const { data: coach } = await supabaseAdmin
              .from('users')
              .select('full_name')
              .eq('id', session.user.id)
              .single()

            const coachName = coach?.full_name || 'Your coach'
            const workoutCount = insertedWorkouts.length

            await supabaseAdmin
              .from('notifications')
              .insert([{
                user_id: runner.id,
                title: '⛰️ New Weekly Expedition Plan',
                message: `${coachName} has architected ${workoutCount} new summit ascents for your training expedition.`,
                type: 'workout', // changed from 'success' to 'workout'
                category: 'training_plan',
                data: {
                  action: 'view_workouts',
                  workoutCount,
                  coachId: session.user.id,
                  coachName
                }
              }])
          }
        }
      } catch (error) {
        console.error('Failed to send notification for new weekly plan', error)
        // Don't fail the main request if notification fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      created: insertedWorkouts?.length || 0,
      workouts: insertedWorkouts 
    })
  } catch (error) {
    console.error('API error in POST /workouts/bulk', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}