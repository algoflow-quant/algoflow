import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAIN_PY_TEMPLATE = `from backtesting import Backtest, Strategy
from backtesting.lib import crossover
from backtesting.test import SMA, GOOG


class BlankStrategy(Strategy):
    """
    A blank strategy template to get you started.

    Modify the init() and next() methods to implement your trading logic.
    """

    def init(self):
        # Initialize indicators here
        pass

    def next(self):
        # Implement your trading logic here
        pass


if __name__ == '__main__':
    # Load your data here
    # data = pd.read_csv('your_data.csv', index_col=0, parse_dates=True)

    # For now, using test data
    bt = Backtest(GOOG, BlankStrategy, cash=10000, commission=.002)
    stats = bt.run()
    print(stats)
    bt.plot()
`

const RESEARCH_IPYNB_TEMPLATE = {
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "# Research Notebook\n",
        "\n",
        "Use this notebook for data exploration, strategy development, and analysis."
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {},
      "outputs": [],
      "source": [
        "import pandas as pd\n",
        "import numpy as np\n",
        "import matplotlib.pyplot as plt\n",
        "import seaborn as sns\n",
        "\n",
        "# Set plotting style\n",
        "plt.style.use('seaborn-v0_8-darkgrid')\n",
        "sns.set_palette('husl')"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## Load Data"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {},
      "outputs": [],
      "source": [
        "# Load your data here\n",
        "# df = pd.read_csv('data.csv', index_col=0, parse_dates=True)"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## Exploratory Data Analysis"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {},
      "outputs": [],
      "source": [
        "# Explore your data here"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## Strategy Development"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {},
      "outputs": [],
      "source": [
        "# Develop and test your strategy logic here"
      ]
    }
  ],
  "metadata": {
    "kernelspec": {
      "display_name": "Python 3",
      "language": "python",
      "name": "python3"
    },
    "language_info": {
      "codemirror_mode": {
        "name": "ipython",
        "version": 3
      },
      "file_extension": ".py",
      "mimetype": "text/x-python",
      "name": "python",
      "nbconvert_exporter": "python",
      "pygments_lexer": "ipython3",
      "version": "3.11.0"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 4
}

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user has access to this project
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: project } = await supabase
      .from('projects')
      .select('*, teams!inner(id)')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', project.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized - not a team member' },
        { status: 403 }
      )
    }

    // Create default files in storage
    const files = [
      {
        path: `${projectId}/main.py`,
        content: MAIN_PY_TEMPLATE,
        contentType: 'text/x-python'
      },
      {
        path: `${projectId}/research.ipynb`,
        content: JSON.stringify(RESEARCH_IPYNB_TEMPLATE, null, 2),
        contentType: 'application/x-ipynb+json'
      }
    ]

    const uploadResults = []

    for (const file of files) {
      const { data, error } = await supabase.storage
        .from('project-files')
        .upload(file.path, file.content, {
          contentType: file.contentType,
          upsert: false
        })

      if (error) {
        console.error(`Error uploading ${file.path}:`, error)
        return NextResponse.json(
          { error: `Failed to create ${file.path}: ${error.message}` },
          { status: 500 }
        )
      }

      uploadResults.push(data)

      // Insert into project_files table for realtime sync
      const fileName = file.path.split('/').pop() || ''
      const fileSize = new Blob([file.content]).size

      await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          name: fileName,
          path: file.path,
          size: fileSize,
          mime_type: file.contentType,
          created_by: user.id
        })
    }

    return NextResponse.json({
      success: true,
      files: uploadResults.map(r => r.path)
    })

  } catch (error) {
    console.error('Error initializing project files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
