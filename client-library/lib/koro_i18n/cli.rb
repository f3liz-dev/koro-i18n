# frozen_string_literal: true

module KoroI18n
  module CLI
    module_function

    def run(args)
      command = args[0] || "help"

      case command
      when "init"
        Commands.init
      when "validate"
        Commands.validate
      when "generate"
        Commands.generate
      when "push"
        Commands.push
      when "pull"
        Commands.pull
      when "help", "--help", "-h"
        Commands.help
      when "--version", "-v"
        puts "Koro i18n CLI v#{VERSION}"
      else
        $stderr.puts "Unknown command: #{command}"
        $stderr.puts "Run: koro help"
        exit 1
      end
    rescue Error => e
      $stderr.puts "❌ Error: #{e.message}"
      exit 1
    rescue Interrupt
      $stderr.puts "\nAborted."
      exit 1
    end
  end
end
